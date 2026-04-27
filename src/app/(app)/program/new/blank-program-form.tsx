"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createBlankProgram } from "@/app/actions/program";

type DayRow = { label: string; title: string };

const DEFAULT_DAYS: DayRow[] = [
  { label: "Day 1", title: "Upper" },
  { label: "Day 2", title: "Lower" },
  { label: "Day 3", title: "Upper" },
  { label: "Day 4", title: "Lower" },
];

export function BlankProgramForm() {
  const [name, setName] = useState("");
  const [weeks, setWeeks] = useState("8");
  const [deloads, setDeloads] = useState("");
  const [days, setDays] = useState<DayRow[]>(DEFAULT_DAYS);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function addDay() {
    if (days.length >= 7) return;
    setDays((prev) => [
      ...prev,
      { label: `Day ${prev.length + 1}`, title: "" },
    ]);
  }

  function removeDay(idx: number) {
    if (days.length <= 1) return;
    setDays((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateDay(idx: number, patch: Partial<DayRow>) {
    setDays((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, ...patch } : d))
    );
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = name.trim();
    const weeksN = parseInt(weeks, 10);
    if (!trimmedName) {
      setErrorMsg("Name required.");
      return;
    }
    if (!Number.isFinite(weeksN) || weeksN < 1 || weeksN > 52) {
      setErrorMsg("Weeks must be between 1 and 52.");
      return;
    }
    const deloadWeeks = deloads
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n));

    const cleanedDays = days.map((d, i) => ({
      label: d.label.trim() || `Day ${i + 1}`,
      title: d.title.trim() || `Day ${i + 1}`,
    }));

    startTransition(async () => {
      try {
        await createBlankProgram({
          name: trimmedName,
          weeks: weeksN,
          deloadWeeks,
          days: cleanedDays,
        });
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Failed to create.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Name" htmlFor="name">
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Hypertrophy block"
          className={fieldClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Weeks" htmlFor="weeks">
          <input
            id="weeks"
            type="text"
            inputMode="numeric"
            value={weeks}
            onChange={(e) => setWeeks(e.target.value.replace(/[^\d]/g, ""))}
            className={fieldClass}
          />
        </Field>
        <Field label="Deload weeks (csv)" htmlFor="deloads">
          <input
            id="deloads"
            type="text"
            inputMode="numeric"
            value={deloads}
            onChange={(e) => setDeloads(e.target.value)}
            placeholder="e.g. 4, 8"
            className={fieldClass}
          />
        </Field>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wide text-neutral-500">
            Days
          </span>
          <button
            type="button"
            onClick={addDay}
            disabled={days.length >= 7}
            className="text-xs text-neutral-400 inline-flex items-center gap-1 disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" /> Add day
          </button>
        </div>
        <ul className="space-y-2">
          {days.map((d, i) => (
            <li
              key={i}
              className="rounded-lg border border-neutral-800 bg-neutral-900 p-2 flex gap-2"
            >
              <input
                type="text"
                value={d.label}
                onChange={(e) => updateDay(i, { label: e.target.value })}
                placeholder={`Day ${i + 1}`}
                className={`${fieldClass} w-24`}
              />
              <input
                type="text"
                value={d.title}
                onChange={(e) => updateDay(i, { title: e.target.value })}
                placeholder="Title (e.g. Upper)"
                className={`${fieldClass} flex-1`}
              />
              <button
                type="button"
                onClick={() => removeDay(i)}
                disabled={days.length <= 1}
                aria-label="Remove day"
                className="h-11 w-11 flex items-center justify-center text-neutral-500 disabled:opacity-30"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {errorMsg ? (
        <p className="text-xs text-red-400">{errorMsg}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full h-11 rounded-md bg-white text-black font-medium text-sm disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create program"}
      </button>
    </form>
  );
}

const fieldClass =
  "w-full h-11 rounded-md bg-neutral-900 border border-neutral-800 px-3 text-base outline-none focus:border-neutral-600";

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="block space-y-1">
      <span className="block text-[11px] uppercase tracking-wide text-neutral-500">
        {label}
      </span>
      {children}
    </label>
  );
}
