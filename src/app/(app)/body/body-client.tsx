"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Camera, Flame, Percent, Ruler, Scale, X } from "lucide-react";
import {
  upsertBodyLog,
  recordBodyPhotos,
  upsertBodyMeasurement,
  deleteBodyMeasurement,
} from "@/app/actions/body";
import type {
  BodyLogRow,
  BodyMeasurementRow,
  BodyPhotoRow,
} from "@/lib/queries";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  MAX_PHOTO_BYTES,
  PHOTO_BUCKET,
  isLikelyImage,
  photoContentType,
  photoExt,
} from "@/lib/photo-upload";
import type { Units } from "@/lib/units";
import { formatWeightShort } from "@/lib/format";
import {
  METRICS,
  METRIC_BY_KEY,
  MEASUREMENT_KEYS,
  type MeasurementKey,
  type MetricKey,
} from "@/lib/body-metrics";
import { MeasuresList, type MeasureRow } from "./measures-list";
import { MetricDetail, type MetricSeriesPoint } from "./metric-detail";
import { BodyPhotos } from "./body-photos";
import { PhotoCapture } from "./photo-capture";

function todayLocalISODate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const byDateDesc = (a: { log_date: string }, b: { log_date: string }) =>
  b.log_date.localeCompare(a.log_date);

export function BodyClient({
  initialLogs,
  initialMeasurements,
  initialPhotos,
  goalWeight,
  units,
}: {
  initialLogs: BodyLogRow[];
  initialMeasurements: BodyMeasurementRow[];
  initialPhotos: BodyPhotoRow[];
  goalWeight: number | null;
  units: Units;
}) {
  const router = useRouter();
  const [logs, setLogs] = useState(initialLogs);
  const [measurements, setMeasurements] = useState(initialMeasurements);
  const [selected, setSelected] = useState<MetricKey | null>(null);

  const today = todayLocalISODate();
  const todayLog = initialLogs.find((l) => l.log_date === today) ?? null;

  const [date, setDate] = useState(today);
  const [weight, setWeight] = useState(
    todayLog ? formatWeightShort(todayLog.weight_lb, units) : ""
  );
  const [calories, setCalories] = useState(
    todayLog && todayLog.calories !== null ? String(todayLog.calories) : ""
  );
  const [bodyFat, setBodyFat] = useState(
    todayLog && todayLog.body_fat_pct !== null
      ? String(todayLog.body_fat_pct)
      : ""
  );
  const [circ, setCirc] = useState<Record<MeasurementKey, string>>(() => {
    const init = {} as Record<MeasurementKey, string>;
    for (const key of MEASUREMENT_KEYS) {
      const m = initialMeasurements.find(
        (x) => x.log_date === today && x.metric === key
      );
      const metric = METRIC_BY_KEY[key];
      init[key] = m ? metric.formatShort(m.value_cm, units) : "";
    }
    return init;
  });
  const [pickedPhotos, setPickedPhotos] = useState<File[]>([]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const addPhotoButtonRef = useRef<HTMLButtonElement>(null);

  const previewUrls = useMemo(
    () => pickedPhotos.map((f) => URL.createObjectURL(f)),
    [pickedPhotos]
  );

  // Revoke the previous batch of object URLs when the picked set changes or the
  // component unmounts — otherwise each pick leaks blob URLs for the page's life.
  useEffect(() => {
    return () => previewUrls.forEach((u) => URL.revokeObjectURL(u));
  }, [previewUrls]);

  function seriesFor(key: MetricKey): MetricSeriesPoint[] {
    const metric = METRIC_BY_KEY[key];
    let pts: MetricSeriesPoint[];
    if (metric.source === "body_measurements") {
      pts = measurements
        .filter((m) => m.metric === key)
        .map((m) => ({ date: m.log_date, value: m.value_cm }));
    } else if (key === "weight") {
      pts = logs.map((l) => ({ date: l.log_date, value: l.weight_lb }));
    } else if (key === "bodyfat") {
      pts = logs
        .filter((l) => l.body_fat_pct !== null)
        .map((l) => ({ date: l.log_date, value: l.body_fat_pct as number }));
    } else {
      pts = logs
        .filter((l) => l.calories !== null)
        .map((l) => ({ date: l.log_date, value: l.calories as number }));
    }
    return pts.slice().sort((a, b) => a.date.localeCompare(b.date));
  }

  const measureRows = useMemo<MeasureRow[]>(
    () =>
      METRICS.map((metric) => {
        const pts = seriesFor(metric.key);
        const latest = pts.length > 0 ? pts[pts.length - 1].value : null;
        const delta =
          pts.length >= 2
            ? pts[pts.length - 1].value - pts[pts.length - 2].value
            : null;
        return { metric, latest, delta };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [logs, measurements]
  );

  function addPickedPhotos(file: File) {
    setPickedPhotos((prev) => [...prev, file].slice(0, 3));
  }

  function removePickedPhoto(idx: number) {
    setPickedPhotos((prev) => prev.filter((_, i) => i !== idx));
  }

  async function uploadPhotos(forDate: string): Promise<string | null> {
    if (pickedPhotos.length === 0) return null;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return "Saved, but not signed in for photo upload.";

    const uploadedPaths: string[] = [];
    let firstUploadError: string | null = null;
    for (const file of pickedPhotos) {
      try {
        if (file.size > MAX_PHOTO_BYTES) {
          throw new Error(
            `Photo too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 25 MB.`
          );
        }
        if (!isLikelyImage(file)) {
          throw new Error(`Unsupported file: ${file.name || "(unnamed)"}`);
        }
        const ext = photoExt(file);
        const path = `${user.id}/body/${forDate}/${crypto.randomUUID()}.${ext}`;
        const contentType = photoContentType(file, ext);
        const { error: upErr } = await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(path, file, { contentType, upsert: false });
        if (upErr) throw upErr;
        uploadedPaths.push(path);
      } catch (err) {
        if (firstUploadError === null) {
          firstUploadError =
            err instanceof Error ? err.message : "Photo upload failed";
        }
      }
    }
    if (uploadedPaths.length > 0) {
      try {
        await recordBodyPhotos({ logDate: forDate, paths: uploadedPaths });
      } catch (err) {
        await supabase.storage.from(PHOTO_BUCKET).remove(uploadedPaths);
        return err instanceof Error ? err.message : "Couldn't save photos";
      }
    }
    return firstUploadError;
  }

  function onSaveEntry() {
    setError(null);
    const w = METRIC_BY_KEY.weight.parse(weight, units);
    if (w === null) {
      setError("Enter a valid weight");
      return;
    }
    const cal = calories.trim() === "" ? null : METRIC_BY_KEY.calories.parse(calories, units);
    if (calories.trim() !== "" && cal === null) {
      setError("Calories must be a positive number");
      return;
    }
    const bf = bodyFat.trim() === "" ? null : METRIC_BY_KEY.bodyfat.parse(bodyFat, units);
    if (bodyFat.trim() !== "" && bf === null) {
      setError("Body fat must be between 0 and 100");
      return;
    }

    const circParsed: { key: MeasurementKey; value: number }[] = [];
    for (const key of MEASUREMENT_KEYS) {
      const raw = circ[key];
      if (raw.trim() === "") continue;
      const v = METRIC_BY_KEY[key].parse(raw, units);
      if (v === null) {
        setError(`Invalid ${METRIC_BY_KEY[key].label.toLowerCase()}`);
        return;
      }
      circParsed.push({ key, value: v });
    }

    startTransition(async () => {
      try {
        await upsertBodyLog({
          date,
          weightLb: w,
          calories: cal,
          bodyFatPct: bf,
          note: null,
        });
        for (const { key, value } of circParsed) {
          await upsertBodyMeasurement({ date, metric: key, valueCm: value });
        }
        const photoErr = await uploadPhotos(date);

        setLogs((prev) =>
          [
            { log_date: date, weight_lb: w, calories: cal, body_fat_pct: bf, note: null },
            ...prev.filter((l) => l.log_date !== date),
          ].sort(byDateDesc)
        );
        setMeasurements((prev) => {
          let next = prev.filter(
            (m) => !(m.log_date === date && MEASUREMENT_KEYS.includes(m.metric as MeasurementKey))
          );
          for (const { key, value } of circParsed) {
            next = [...next, { log_date: date, metric: key, value_cm: value }];
          }
          return next.sort(byDateDesc);
        });

        setWeight("");
        setCalories("");
        setBodyFat("");
        setCirc(() => {
          const cleared = {} as Record<MeasurementKey, string>;
          for (const key of MEASUREMENT_KEYS) cleared[key] = "";
          return cleared;
        });
        setPickedPhotos([]);
        if (photoErr) setError(photoErr);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });
  }

  function onQuickAdd(key: MetricKey, valueStr: string) {
    setError(null);
    const metric = METRIC_BY_KEY[key];
    const value = metric.parse(valueStr, units);
    if (value === null) {
      setError(`Enter a valid ${metric.label.toLowerCase()}`);
      return;
    }
    const d = todayLocalISODate();

    startTransition(async () => {
      try {
        if (metric.source === "body_measurements") {
          await upsertBodyMeasurement({
            date: d,
            metric: key as MeasurementKey,
            valueCm: value,
          });
          setMeasurements((prev) =>
            [
              ...prev.filter((m) => !(m.log_date === d && m.metric === key)),
              { log_date: d, metric: key, value_cm: value },
            ].sort(byDateDesc)
          );
        } else {
          const existing = logs.find((l) => l.log_date === d) ?? null;
          const weightLb = key === "weight" ? value : existing?.weight_lb;
          if (weightLb === undefined) {
            setError("Log weight for today first.");
            return;
          }
          const cal =
            key === "calories" ? value : (existing?.calories ?? null);
          const bf =
            key === "bodyfat" ? value : (existing?.body_fat_pct ?? null);
          await upsertBodyLog({
            date: d,
            weightLb,
            calories: cal,
            bodyFatPct: bf,
            note: null,
          });
          setLogs((prev) =>
            [
              { log_date: d, weight_lb: weightLb, calories: cal, body_fat_pct: bf, note: null },
              ...prev.filter((l) => l.log_date !== d),
            ].sort(byDateDesc)
          );
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });
  }

  function onDeleteMeasurement(key: MetricKey, d: string) {
    startTransition(async () => {
      await deleteBodyMeasurement({ date: d, metric: key as MeasurementKey });
      setMeasurements((prev) =>
        prev.filter((m) => !(m.log_date === d && m.metric === key))
      );
      router.refresh();
    });
  }

  if (selected) {
    const metric = METRIC_BY_KEY[selected];
    return (
      <MetricDetail
        metric={metric}
        points={seriesFor(selected)}
        units={units}
        goalWeight={goalWeight}
        onBack={() => {
          setSelected(null);
          setError(null);
        }}
        onQuickAdd={(v) => onQuickAdd(selected, v)}
        onDeleteEntry={(d) => onDeleteMeasurement(selected, d)}
        pending={pending}
        error={error}
      />
    );
  }

  const existingEntry = logs.find((l) => l.log_date === date) ?? null;

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Body</h1>
        <p className="text-xs text-foreground-muted">
          Weight · body fat · measurements · photos
        </p>
      </header>

      <div
        id="body-entry-card"
        className="rounded-lg border border-border bg-surface p-3 space-y-3 scroll-mt-4"
      >
        <label className="block">
          <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-foreground-muted">
            <Calendar className="w-3.5 h-3.5 shrink-0" /> Date
          </span>
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => {
              const d = e.target.value;
              setDate(d);
              const found = logs.find((l) => l.log_date === d);
              setWeight(found ? formatWeightShort(found.weight_lb, units) : "");
              setCalories(
                found && found.calories !== null ? String(found.calories) : ""
              );
              setBodyFat(
                found && found.body_fat_pct !== null
                  ? String(found.body_fat_pct)
                  : ""
              );
              setCirc(() => {
                const next = {} as Record<MeasurementKey, string>;
                for (const key of MEASUREMENT_KEYS) {
                  const m = measurements.find(
                    (x) => x.log_date === d && x.metric === key
                  );
                  next[key] = m
                    ? METRIC_BY_KEY[key].formatShort(m.value_cm, units)
                    : "";
                }
                return next;
              });
            }}
            className="mt-1 w-full h-11 rounded-md bg-surface-subtle border border-border px-3 text-base tabular-nums outline-none focus:border-border-strong"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-foreground-muted">
              <Scale className="w-3.5 h-3.5 shrink-0" /> Weight (
              {METRIC_BY_KEY.weight.unitLabel(units)})
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder={units === "metric" ? "e.g. 56.5" : "e.g. 124.4"}
              className="mt-1 w-full h-11 rounded-md bg-surface-subtle border border-border px-3 text-base tabular-nums outline-none focus:border-border-strong"
            />
          </label>
          <label className="block">
            <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-foreground-muted">
              <Percent className="w-3.5 h-3.5 shrink-0" /> Body fat{" "}
              <span className="opacity-60">(opt)</span>
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
              placeholder="e.g. 18.5"
              className="mt-1 w-full h-11 rounded-md bg-surface-subtle border border-border px-3 text-base tabular-nums outline-none focus:border-border-strong"
            />
          </label>
        </div>

        <label className="block">
          <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-foreground-muted">
            <Flame className="w-3.5 h-3.5 shrink-0" /> Calories{" "}
            <span className="opacity-60">(optional)</span>
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={calories}
            onChange={(e) => setCalories(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="e.g. 2400"
            className="mt-1 w-full h-11 rounded-md bg-surface-subtle border border-border px-3 text-base tabular-nums outline-none focus:border-border-strong"
          />
        </label>

        <div className="space-y-1.5">
          <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-foreground-muted">
            <Ruler className="w-3.5 h-3.5 shrink-0" /> Measurements (
            {METRIC_BY_KEY.chest.unitLabel(units)}){" "}
            <span className="opacity-60">(optional)</span>
          </span>
          <div className="grid grid-cols-2 gap-3">
            {MEASUREMENT_KEYS.map((key) => (
              <label key={key} className="block">
                <span className="text-[11px] uppercase tracking-wide text-foreground-muted">
                  {METRIC_BY_KEY[key].label}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={circ[key]}
                  onChange={(e) =>
                    setCirc((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  className="mt-1 w-full h-11 rounded-md bg-surface-subtle border border-border px-3 text-base tabular-nums outline-none focus:border-border-strong"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-foreground-muted">
            <Camera className="w-3.5 h-3.5 shrink-0" /> Progress photos{" "}
            <span className="opacity-60">(up to 3)</span>
          </span>
          {pickedPhotos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {pickedPhotos.map((file, i) => (
                <div
                  key={`${file.name}-${i}`}
                  className="relative aspect-square rounded-md overflow-hidden bg-surface-subtle border border-border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrls[i]}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePickedPhoto(i)}
                    aria-label="Remove photo"
                    className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          {pickedPhotos.length < 3 ? (
            <PhotoCapture
              onCapture={addPickedPhotos}
              lastPhotoUrl={initialPhotos[0]?.signed_url ?? null}
              triggerRef={addPhotoButtonRef}
            />
          ) : null}
        </div>

        {error ? <p className="text-xs text-red-400">{error}</p> : null}

        <button
          type="button"
          onClick={onSaveEntry}
          disabled={pending}
          className={cn(
            "w-full h-11 rounded-md font-medium text-sm bg-accent text-accent-foreground",
            pending && "opacity-50"
          )}
        >
          {pending ? "Saving…" : existingEntry ? "Update entry" : "Save entry"}
        </button>
      </div>

      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-wide text-foreground-muted">
          Measures
        </h2>
        <MeasuresList rows={measureRows} units={units} onSelect={setSelected} />
      </section>

      {initialPhotos.length > 0 ? (
        <BodyPhotos photos={initialPhotos} />
      ) : (
        <section className="space-y-2">
          <h2 className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-foreground-muted">
            <Camera className="w-3.5 h-3.5 shrink-0" /> Progress photos
          </h2>
          <button
            type="button"
            onClick={() => {
              document
                .getElementById("body-entry-card")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
              addPhotoButtonRef.current?.click();
            }}
            className="w-full rounded-lg border border-dashed border-border-strong bg-surface px-3 py-6 flex flex-col items-center justify-center gap-1.5 text-foreground-muted"
          >
            <Camera className="w-5 h-5" />
            <span className="text-sm">Add your first progress photo</span>
            <span className="text-xs opacity-70">
              Track visual changes over time
            </span>
          </button>
        </section>
      )}
    </div>
  );
}
