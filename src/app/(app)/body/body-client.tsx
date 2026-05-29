"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Camera, Trash2, TrendingUp, X } from "lucide-react";
import {
  upsertBodyLog,
  deleteBodyLog,
  recordBodyPhotos,
} from "@/app/actions/body";
import type { BodyLogRow, BodyPhotoRow } from "@/lib/queries";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  avgWeight,
  emaSeries,
  padToWindow,
  pointsInDayRange,
  pointsInLastDays,
  predictGoalDate,
  rangeAlphaFor,
  weeklyRateFromEma,
  windowSeries,
  type Range,
} from "@/lib/body-stats";
import { BodyChart, type BodyPoint } from "./body-chart";
import { BodyRangeTabs } from "./range-tabs";
import { BodyPhotos } from "./body-photos";

import {
  MAX_PHOTO_BYTES,
  PHOTO_BUCKET,
  isLikelyImage,
  photoContentType,
  photoExt,
} from "@/lib/photo-upload";
import type { Units } from "@/lib/units";
import {
  formatSignedWeight,
  formatWeight,
  formatWeightShort,
  parseWeightInput,
  unitLabel,
} from "@/lib/format";

function todayLocalISODate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function BodyClient({
  initialLogs,
  initialPhotos,
  goalWeight,
  units,
}: {
  initialLogs: BodyLogRow[];
  initialPhotos: BodyPhotoRow[];
  goalWeight: number | null;
  units: Units;
}) {
  const router = useRouter();
  const [logs, setLogs] = useState(initialLogs);
  const initialDate = todayLocalISODate();
  const initialEntry = initialLogs.find((l) => l.log_date === initialDate) ?? null;
  const [date, setDate] = useState(initialDate);
  const [weight, setWeight] = useState(
    initialEntry ? formatWeightShort(initialEntry.weight_lb, units) : ""
  );
  const [calories, setCalories] = useState(
    initialEntry && initialEntry.calories !== null
      ? String(initialEntry.calories)
      : ""
  );
  const [bodyFat, setBodyFat] = useState(
    initialEntry && initialEntry.body_fat_pct !== null
      ? String(initialEntry.body_fat_pct)
      : ""
  );
  const [pickedPhotos, setPickedPhotos] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<Range>("3m");

  const HISTORY_INITIAL = 5;
  const HISTORY_PAGE = 10;
  const [historyVisibleCount, setHistoryVisibleCount] = useState(HISTORY_INITIAL);
  const visibleLogs = logs.slice(0, historyVisibleCount);
  const historyRemaining = Math.max(0, logs.length - historyVisibleCount);
  const historyAtMax = historyVisibleCount >= logs.length;
  const historyNextStep = Math.min(HISTORY_PAGE, historyRemaining);

  const existing = useMemo(
    () => logs.find((l) => l.log_date === date) ?? null,
    [logs, date]
  );

  const chartData = useMemo(
    () =>
      logs
        .slice()
        .sort((a, b) => a.log_date.localeCompare(b.log_date))
        .map((l) => ({
          date: l.log_date,
          weight: l.weight_lb,
          calories: l.calories,
        })),
    [logs]
  );

  const ema = useMemo(
    () => emaSeries(chartData, rangeAlphaFor(range)),
    [chartData, range]
  );

  const chartWithEma = useMemo<BodyPoint[]>(
    () => chartData.map((p, i) => ({ ...p, ema: ema[i] ?? null })),
    [chartData, ema]
  );

  const windowedData = useMemo<BodyPoint[]>(() => {
    const windowed = windowSeries(chartWithEma, range);
    return padToWindow<BodyPoint>(
      windowed,
      (date) => ({ date, weight: null, calories: null, ema: null }),
      range
    );
  }, [chartWithEma, range]);

  const stats = useMemo(() => {
    if (chartData.length === 0) return null;
    const last7 = pointsInLastDays(chartData, 7);
    const prior7 = pointsInDayRange(chartData, 14, 7);
    const avg7 = avgWeight(last7);
    const avg7Prior = avgWeight(prior7);
    const delta = avg7 !== null && avg7Prior !== null ? avg7 - avg7Prior : null;
    const rate = weeklyRateFromEma(chartData, ema);
    return { avg7, delta, rate };
  }, [chartData, ema]);

  const predictedGoalDate = useMemo(() => {
    if (goalWeight === null || stats === null) return null;
    if (stats.avg7 === null || stats.rate === null) return null;
    return predictGoalDate(stats.avg7, goalWeight, stats.rate);
  }, [goalWeight, stats]);

  const previewUrls = useMemo(
    () => pickedPhotos.map((f) => URL.createObjectURL(f)),
    [pickedPhotos]
  );

  function addPickedPhotos(files: FileList | null) {
    if (!files) return;
    const incoming = Array.from(files);
    setPickedPhotos((prev) => [...prev, ...incoming].slice(0, 3));
  }

  function removePickedPhoto(idx: number) {
    setPickedPhotos((prev) => prev.filter((_, i) => i !== idx));
  }

  function onSave() {
    setError(null);
    const w = parseWeightInput(weight, units);
    if (w === null) {
      setError("Enter a valid weight");
      return;
    }
    const cal = calories.trim() === "" ? null : parseInt(calories, 10);
    if (cal !== null && (!Number.isFinite(cal) || cal < 0)) {
      setError("Calories must be a positive number");
      return;
    }
    let bf: number | null = null;
    if (bodyFat.trim() !== "") {
      bf = Number(bodyFat);
      if (!Number.isFinite(bf) || bf <= 0 || bf >= 100) {
        setError("Body fat must be between 0 and 100");
        return;
      }
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

        if (pickedPhotos.length > 0) {
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) {
            setError("Saved weight, but not signed in for photo upload.");
            return;
          }

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
                throw new Error(
                  `Unsupported file: ${file.name || "(unnamed)"}`
                );
              }
              const ext = photoExt(file);
              const path = `${user.id}/body/${date}/${crypto.randomUUID()}.${ext}`;
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
              await recordBodyPhotos({ logDate: date, paths: uploadedPaths });
            } catch (err) {
              await supabase.storage.from(PHOTO_BUCKET).remove(uploadedPaths);
              setError(
                err instanceof Error ? err.message : "Couldn't save photos"
              );
              return;
            }
          }
          if (firstUploadError) {
            setError(firstUploadError);
          }
        }

        setLogs((prev) => {
          const others = prev.filter((l) => l.log_date !== date);
          return [
            {
              log_date: date,
              weight_lb: w,
              calories: cal,
              body_fat_pct: bf,
              note: null,
            },
            ...others,
          ].sort((a, b) => b.log_date.localeCompare(a.log_date));
        });
        setWeight("");
        setCalories("");
        setBodyFat("");
        setPickedPhotos([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });
  }

  function onDelete(d: string) {
    if (!confirm(`Delete entry for ${d}?`)) return;
    startTransition(async () => {
      await deleteBodyLog({ date: d });
      setLogs((prev) => prev.filter((l) => l.log_date !== d));
      if (d === date) {
        setWeight("");
        setCalories("");
        setBodyFat("");
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Body</h1>
        <p className="text-xs text-foreground-muted">
          Daily weight · body fat · calories · photos
        </p>
      </header>

      <div className="rounded-lg border border-border bg-surface p-3 space-y-3">
        <label className="block">
          <span className="text-[11px] uppercase tracking-wide text-foreground-muted">
            Date
          </span>
          <input
            type="date"
            value={date}
            max={todayLocalISODate()}
            onChange={(e) => {
              setDate(e.target.value);
              const found = logs.find((l) => l.log_date === e.target.value);
              setWeight(found ? formatWeightShort(found.weight_lb, units) : "");
              setCalories(
                found && found.calories !== null ? String(found.calories) : ""
              );
              setBodyFat(
                found && found.body_fat_pct !== null
                  ? String(found.body_fat_pct)
                  : ""
              );
            }}
            className="mt-1 w-full h-11 rounded-md bg-surface-subtle border border-border px-3 text-sm tabular-nums outline-none focus:border-border-strong"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[11px] uppercase tracking-wide text-foreground-muted">
              Weight ({unitLabel(units)})
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
            <span className="text-[11px] uppercase tracking-wide text-foreground-muted">
              Body fat % <span className="opacity-60">(opt)</span>
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
          <span className="text-[11px] uppercase tracking-wide text-foreground-muted">
            Calories <span className="opacity-60">(optional)</span>
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

        <div className="space-y-2">
          <span className="text-[11px] uppercase tracking-wide text-foreground-muted">
            Progress photos <span className="opacity-60">(up to 3)</span>
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => addPickedPhotos(e.target.files)}
            className="hidden"
          />
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
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-11 rounded-md text-sm border border-dashed border-border-strong text-foreground-muted flex items-center justify-center gap-1.5"
            >
              <Camera className="w-4 h-4" /> Add photo
            </button>
          ) : null}
        </div>

        {error ? <p className="text-xs text-red-400">{error}</p> : null}

        <button
          type="button"
          onClick={onSave}
          disabled={pending}
          className={cn(
            "w-full h-11 rounded-md font-medium text-sm bg-accent text-accent-foreground",
            pending && "opacity-50"
          )}
        >
          {pending ? "Saving…" : existing ? "Update entry" : "Save entry"}
        </button>
      </div>

      {chartData.length >= 2 ? (
        <div className="space-y-3">
          {stats ? (
            <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 tabular-nums">
              <div>
                <div className="text-base">
                  {formatWeightShort(stats.avg7, units)}
                </div>
                <div className="text-[10px] uppercase tracking-wide text-foreground-muted mt-0.5">
                  7d avg
                </div>
              </div>
              <div>
                <div
                  className={cn(
                    "text-base",
                    stats.delta !== null && stats.delta < 0 && "text-emerald-400",
                    stats.delta !== null && stats.delta > 0 && "text-amber-400"
                  )}
                >
                  {formatSignedWeight(stats.delta, units)}
                </div>
                <div className="text-[10px] uppercase tracking-wide text-foreground-muted mt-0.5">
                  Δ vs prior wk
                </div>
              </div>
              <div>
                <div className="text-base">
                  {formatSignedWeight(stats.rate, units)}
                </div>
                <div className="text-[10px] uppercase tracking-wide text-foreground-muted mt-0.5">
                  {unitLabel(units)} / wk
                </div>
              </div>
            </div>
          ) : null}
          <BodyRangeTabs active={range} onChange={setRange} />
          <BodyChart data={windowedData} goalWeight={goalWeight} units={units} />
          {goalWeight !== null && stats && stats.avg7 !== null ? (
            <p className="text-xs text-center text-foreground-muted">
              {predictedGoalDate ? (
                <>
                  On pace for{" "}
                  <span className="text-foreground font-medium">
                    {formatWeight(goalWeight, units)}
                  </span>{" "}
                  on{" "}
                  <span className="text-foreground font-medium">
                    {format(predictedGoalDate, "MMM d, yyyy")}
                  </span>
                </>
              ) : stats.rate === null ? (
                <>Log more days to see goal pace.</>
              ) : (
                <>Trend not moving toward goal.</>
              )}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-surface p-6 text-center space-y-3">
          <TrendingUp
            aria-hidden="true"
            strokeWidth={1.5}
            className="w-10 h-10 text-foreground-muted mx-auto"
          />
          <p className="text-sm text-foreground-muted">
            Log a few days to see trends.
          </p>
        </div>
      )}

      <BodyPhotos photos={initialPhotos} />

      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-wide text-foreground-muted">
          History
        </h2>
        {logs.length === 0 ? (
          <p className="text-sm text-foreground-muted">No entries yet.</p>
        ) : (
          <ul className="rounded-lg border border-border bg-surface divide-y divide-[color:var(--color-border)]">
            {visibleLogs.map((l) => (
              <li
                key={l.log_date}
                className="flex items-center gap-3 px-3 py-2.5 text-sm"
              >
                <div className="w-20 text-foreground-muted tabular-nums text-xs">
                  {format(new Date(l.log_date + "T00:00:00"), "MMM d")}
                </div>
                <div className="flex-1 tabular-nums">
                  <span className="font-medium">{formatWeight(l.weight_lb, units)}</span>
                  {l.body_fat_pct !== null ? (
                    <span className="text-foreground-muted ml-2 text-xs">
                      {l.body_fat_pct}% bf
                    </span>
                  ) : null}
                  {l.calories !== null ? (
                    <span className="text-foreground-muted ml-2 text-xs">
                      {l.calories.toLocaleString()} cal
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(l.log_date)}
                  aria-label={`Delete ${l.log_date}`}
                  className="h-8 w-8 flex items-center justify-center text-foreground-muted"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {logs.length > HISTORY_INITIAL ? (
          <button
            type="button"
            onClick={() => {
              if (historyAtMax) {
                setHistoryVisibleCount(HISTORY_INITIAL);
              } else {
                setHistoryVisibleCount((c) => c + HISTORY_PAGE);
              }
            }}
            className="w-full h-10 rounded-md text-sm text-foreground-muted hover:text-foreground border border-border bg-surface-subtle"
          >
            {historyAtMax ? "Show less" : `Show ${historyNextStep} more`}
          </button>
        ) : null}
      </section>
    </div>
  );
}
