"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  upsertBodyLog,
  upsertBodyMeasurement,
  deleteBodyMeasurement,
} from "@/app/actions/body";
import type {
  BodyLogRow,
  BodyMeasurementRow,
  BodyPhotoRow,
} from "@/lib/queries";
import type { Units } from "@/lib/units";
import {
  METRICS,
  METRIC_BY_KEY,
  type MeasurementKey,
  type MetricKey,
} from "@/lib/body-metrics";
import { MeasuresList, type MeasureRow } from "./measures-list";
import { MetricDetail, type MetricSeriesPoint } from "./metric-detail";
import { BodyPhotos } from "./body-photos";
import { PhotoAdd } from "./photo-add";

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
  // logs/measurements are server-authoritative: every mutation revalidates
  // /body and calls router.refresh(), so these always reflect the DB.
  const logs = initialLogs;
  const measurements = initialMeasurements;
  const [selected, setSelected] = useState<MetricKey | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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

  function onQuickAdd(key: MetricKey, valueStr: string, date: string) {
    setError(null);
    const metric = METRIC_BY_KEY[key];
    const value = metric.parse(valueStr, units);
    if (value === null) {
      setError(`Enter a valid ${metric.label.toLowerCase()}`);
      return;
    }

    startTransition(async () => {
      try {
        if (metric.source === "body_measurements") {
          await upsertBodyMeasurement({
            date,
            metric: key as MeasurementKey,
            valueCm: value,
          });
        } else {
          const existing = logs.find((l) => l.log_date === date) ?? null;
          const weightLb = key === "weight" ? value : existing?.weight_lb;
          if (weightLb === undefined) {
            setError("Log weight for that date first.");
            return;
          }
          const cal =
            key === "calories" ? value : (existing?.calories ?? null);
          const bf =
            key === "bodyfat" ? value : (existing?.body_fat_pct ?? null);
          await upsertBodyLog({
            date,
            weightLb,
            calories: cal,
            bodyFatPct: bf,
            note: null,
          });
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
        onQuickAdd={(v, d) => onQuickAdd(selected, v, d)}
        onDeleteEntry={(d) => onDeleteMeasurement(selected, d)}
        pending={pending}
        error={error}
      />
    );
  }

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Body</h1>
        <p className="text-xs text-foreground-muted">
          Weight · body fat · measurements · photos
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-wide text-foreground-muted">
          Measures
        </h2>
        <MeasuresList rows={measureRows} units={units} onSelect={setSelected} />
        <p className="text-xs text-foreground-muted">
          Tap a measure to log a value or see its trend.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-wide text-foreground-muted">
          Progress photos
        </h2>
        <PhotoAdd
          lastPhotoUrl={initialPhotos[0]?.signed_url ?? null}
          loggedDates={new Set(logs.map((l) => l.log_date))}
        />
        {initialPhotos.length > 0 ? (
          <BodyPhotos photos={initialPhotos} />
        ) : (
          <p className="text-xs text-foreground-muted">
            No photos yet — add one for a day you&apos;ve logged a weight.
          </p>
        )}
      </section>
    </div>
  );
}
