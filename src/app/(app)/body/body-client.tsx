"use client";

import { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { upsertBodyLog, deleteBodyLog } from "@/app/actions/body";
import type { BodyLogRow } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { BodyChart } from "./body-chart";

function todayLocalISODate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function BodyClient({ initialLogs }: { initialLogs: BodyLogRow[] }) {
  const [logs, setLogs] = useState(initialLogs);
  const initialDate = todayLocalISODate();
  const initialEntry = initialLogs.find((l) => l.log_date === initialDate) ?? null;
  const [date, setDate] = useState(initialDate);
  const [weight, setWeight] = useState(
    initialEntry ? String(initialEntry.weight_lb) : ""
  );
  const [calories, setCalories] = useState(
    initialEntry && initialEntry.calories !== null
      ? String(initialEntry.calories)
      : ""
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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

  function onSave() {
    setError(null);
    const w = Number(weight);
    if (!Number.isFinite(w) || w <= 0) {
      setError("Enter a valid weight");
      return;
    }
    const cal = calories.trim() === "" ? null : parseInt(calories, 10);
    if (cal !== null && (!Number.isFinite(cal) || cal < 0)) {
      setError("Calories must be a positive number");
      return;
    }
    startTransition(async () => {
      try {
        await upsertBodyLog({ date, weightLb: w, calories: cal, note: null });
        setLogs((prev) => {
          const others = prev.filter((l) => l.log_date !== date);
          return [
            { log_date: date, weight_lb: w, calories: cal, note: null },
            ...others,
          ].sort((a, b) => b.log_date.localeCompare(a.log_date));
        });
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
      }
    });
  }

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Body</h1>
        <p className="text-xs text-neutral-500">
          Daily weight · calories optional
        </p>
      </header>

      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3 space-y-3">
        <label className="block">
          <span className="text-[11px] uppercase tracking-wide text-neutral-500">
            Date
          </span>
          <input
            type="date"
            value={date}
            max={todayLocalISODate()}
            onChange={(e) => {
              setDate(e.target.value);
              const found = logs.find((l) => l.log_date === e.target.value);
              setWeight(found ? String(found.weight_lb) : "");
              setCalories(found && found.calories !== null ? String(found.calories) : "");
            }}
            className="mt-1 w-full h-11 rounded-md bg-neutral-950 border border-neutral-800 px-3 text-sm tabular-nums outline-none focus:border-neutral-600"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[11px] uppercase tracking-wide text-neutral-500">
              Weight (lb)
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="—"
              className="mt-1 w-full h-11 rounded-md bg-neutral-950 border border-neutral-800 px-3 text-base tabular-nums outline-none focus:border-neutral-600"
            />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-wide text-neutral-500">
              Calories <span className="text-neutral-600">(optional)</span>
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={calories}
              onChange={(e) => setCalories(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="—"
              className="mt-1 w-full h-11 rounded-md bg-neutral-950 border border-neutral-800 px-3 text-base tabular-nums outline-none focus:border-neutral-600"
            />
          </label>
        </div>

        {error ? <p className="text-xs text-red-400">{error}</p> : null}

        <button
          type="button"
          onClick={onSave}
          disabled={pending}
          className={cn(
            "w-full h-11 rounded-md font-medium text-sm bg-white text-black",
            pending && "opacity-50"
          )}
        >
          {pending ? "Saving…" : existing ? "Update entry" : "Save entry"}
        </button>
      </div>

      {chartData.length >= 2 ? <BodyChart data={chartData} /> : null}

      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-wide text-neutral-500">
          History
        </h2>
        {logs.length === 0 ? (
          <p className="text-sm text-neutral-500">No entries yet.</p>
        ) : (
          <ul className="rounded-lg border border-neutral-800 bg-neutral-900 divide-y divide-neutral-800">
            {logs.map((l) => (
              <li
                key={l.log_date}
                className="flex items-center gap-3 px-3 py-2.5 text-sm"
              >
                <div className="w-20 text-neutral-400 tabular-nums text-xs">
                  {format(new Date(l.log_date + "T00:00:00"), "MMM d")}
                </div>
                <div className="flex-1 tabular-nums">
                  <span className="font-medium">{l.weight_lb} lb</span>
                  {l.calories !== null ? (
                    <span className="text-neutral-500 ml-2 text-xs">
                      {l.calories.toLocaleString()} cal
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(l.log_date)}
                  aria-label={`Delete ${l.log_date}`}
                  className="h-8 w-8 flex items-center justify-center text-neutral-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
