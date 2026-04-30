"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createBlankProgram } from "@/app/actions/program";

type DayRow = { label: string; title: string };

const DEFAULT_DAYS: DayRow[] = [
  { label: "Day 1", title: "Upper" },
  { label: "Day 2", title: "Lower" },
  { label: "Day 3", title: "Upper" },
  { label: "Day 4", title: "Lower" },
];

const DRAFT_KEY = "new-program-draft";

type Draft = {
  name: string;
  weeks: string;
  deloadSet: number[];
  days: DayRow[];
};

function loadDraft(): Draft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

function saveDraft(d: Draft) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {}
}

function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {}
}

export function BlankProgramForm() {
  const draft = useMemo(() => loadDraft(), []);

  const [name, setName] = useState(draft?.name ?? "");
  const [weeks, setWeeks] = useState(draft?.weeks ?? "8");
  const [deloadSet, setDeloadSet] = useState<Set<number>>(
    new Set(draft?.deloadSet ?? [])
  );
  const [days, setDays] = useState<DayRow[]>(draft?.days ?? DEFAULT_DAYS);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Persist draft on every change
  useEffect(() => {
    saveDraft({ name, weeks, deloadSet: Array.from(deloadSet), days });
  }, [name, weeks, deloadSet, days]);

  const weeksN = useMemo(() => {
    const n = parseInt(weeks, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [weeks]);

  function toggleDeload(w: number) {
    setDeloadSet((prev) => {
      const next = new Set(prev);
      if (next.has(w)) next.delete(w);
      else next.add(w);
      return next;
    });
  }

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
    if (!trimmedName) {
      setErrorMsg("Name required.");
      return;
    }
    if (weeksN < 1 || weeksN > 52) {
      setErrorMsg("Weeks must be between 1 and 52.");
      return;
    }
    const deloadWeeks = Array.from(deloadSet)
      .filter((w) => w >= 1 && w <= weeksN)
      .sort((a, b) => a - b);

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
        clearDraft();
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

      <div className="space-y-2">
        <span className="block text-[11px] uppercase tracking-wide text-neutral-500">
          Deload weeks
        </span>
        {weeksN > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: weeksN }, (_, i) => i + 1).map((w) => {
              const active = deloadSet.has(w);
              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => toggleDeload(w)}
                  aria-pressed={active}
                  className={cn(
                    "h-9 min-w-[44px] px-2 rounded-md text-[11px] tabular-nums border",
                    active
                      ? "bg-accent text-accent-foreground border-accent"
                      : "border-neutral-800 text-neutral-400 hover:text-neutral-200"
                  )}
                >
                  W{w}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-[11px] text-neutral-500">
            Set a number of weeks to pick deloads.
          </p>
        )}
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
              className="rounded-lg border border-neutral-800 bg-neutral-900 p-3 flex gap-2 items-start"
            >
              <div className="flex-1 flex gap-2">
                <label className="block space-y-1 w-24 shrink-0">
                  <span className="block text-[10px] uppercase tracking-wide text-neutral-500">
                    Label
                  </span>
                  <input
                    type="text"
                    value={d.label}
                    onChange={(e) => updateDay(i, { label: e.target.value })}
                    placeholder={`Day ${i + 1}`}
                    className={fieldClass}
                  />
                </label>
                <label className="block space-y-1 flex-1 min-w-0">
                  <span className="block text-[10px] uppercase tracking-wide text-neutral-500">
                    Title
                  </span>
                  <input
                    type="text"
                    value={d.title}
                    onChange={(e) => updateDay(i, { title: e.target.value })}
                    placeholder="e.g. Upper"
                    className={fieldClass}
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => removeDay(i)}
                disabled={days.length <= 1}
                aria-label="Remove day"
                className="h-11 w-11 shrink-0 flex items-center justify-center text-neutral-500 disabled:opacity-30"
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
        className="btn-primary w-full h-11 text-sm"
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
