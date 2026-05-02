"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExerciseAnimation } from "@/components/exercise-animation";
import { addExerciseToProgram } from "@/app/actions/program";

type CatalogEntry = {
  id: string;
  name: string;
  equipment: string | null;
  category: string;
  force: string | null;
  level: string | null;
  primary: string[];
  custom?: boolean;
};

const IMG = (slug: string) =>
  `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${slug}/0.jpg`;

const CUSTOM_IMG = "/icon-192.png";

function imageFor(entry: CatalogEntry) {
  return entry.custom ? CUSTOM_IMG : IMG(entry.id);
}

const MUSCLE_GROUPS: { label: string; match: (e: CatalogEntry) => boolean }[] =
  [
    { label: "Abs", match: (e) => e.primary.includes("abdominals") },
    {
      label: "Arms",
      match: (e) =>
        e.primary.some((m) => ["biceps", "triceps", "forearms"].includes(m)),
    },
    {
      label: "Back",
      match: (e) =>
        e.primary.some((m) =>
          ["lats", "lower back", "middle back", "traps"].includes(m)
        ),
    },
    { label: "Calves", match: (e) => e.primary.includes("calves") },
    { label: "Cardio", match: (e) => e.category === "cardio" },
    { label: "Chest", match: (e) => e.primary.includes("chest") },
    {
      label: "Legs",
      match: (e) =>
        e.primary.some((m) =>
          ["quadriceps", "hamstrings", "glutes", "adductors", "abductors"].includes(
            m
          )
        ),
    },
    {
      label: "Shoulders",
      match: (e) => e.primary.some((m) => ["shoulders", "neck"].includes(m)),
    },
  ];

export function AddExerciseClient({
  programDayId,
  redirectWeek,
}: {
  programDayId: string;
  redirectWeek: number;
}) {
  const [catalog, setCatalog] = useState<CatalogEntry[] | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CatalogEntry | null>(null);
  const [activeMuscles, setActiveMuscles] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    fetch("/data/exercises-catalog.json")
      .then((r) => r.json())
      .then((d: CatalogEntry[]) => {
        if (!cancelled) setCatalog(d);
      })
      .catch(() => {
        if (!cancelled) setCatalog([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasFilters = query.trim() !== "" || activeMuscles.size > 0;

  const filtered = useMemo(() => {
    if (!catalog) return [];
    const q = query.trim().toLowerCase();
    const tokens = q ? q.split(/\s+/) : [];

    const muscleMatchers = MUSCLE_GROUPS.filter((g) =>
      activeMuscles.has(g.label)
    );

    if (!hasFilters) {
      return catalog.slice(0, 30);
    }

    return catalog
      .filter((e) => {
        if (tokens.length > 0) {
          const hay =
            `${e.name} ${e.equipment ?? ""} ${e.primary.join(" ")}`.toLowerCase();
          if (!tokens.every((t) => hay.includes(t))) return false;
        }
        if (muscleMatchers.length > 0) {
          if (!muscleMatchers.some((g) => g.match(e))) return false;
        }
        return true;
      })
      .slice(0, 100);
  }, [catalog, query, activeMuscles, hasFilters]);

  function toggleMuscle(label: string) {
    setActiveMuscles((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  if (selected) {
    return (
      <ConfigForm
        entry={selected}
        programDayId={programDayId}
        redirectWeek={redirectWeek}
        onCancel={() => setSelected(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search exercises…"
          autoFocus
          className="w-full h-12 rounded-md bg-neutral-900 border border-neutral-800 pl-9 pr-3 text-base outline-none focus:border-neutral-600"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wide text-neutral-500">
            Muscle group
          </span>
          {activeMuscles.size > 0 ? (
            <button
              type="button"
              onClick={() => setActiveMuscles(new Set())}
              className="text-[11px] text-neutral-400 inline-flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {MUSCLE_GROUPS.map((g) => {
            const on = activeMuscles.has(g.label);
            return (
              <button
                key={g.label}
                type="button"
                onClick={() => toggleMuscle(g.label)}
                className={cn(
                  "h-8 px-3 rounded-full text-xs border transition-colors",
                  on
                    ? "bg-accent text-accent-foreground border-accent"
                    : "border-neutral-800 bg-neutral-900 text-neutral-300"
                )}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      </div>

      {catalog === null ? (
        <p className="text-sm text-neutral-500">Loading catalog…</p>
      ) : filtered.length === 0 ? (
        <CustomFallback
          query={query}
          onPick={(name) =>
            setSelected({
              id: "custom",
              name,
              equipment: null,
              category: "custom",
              force: null,
              level: null,
              primary: [],
              custom: true,
            })
          }
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => setSelected(entry)}
                className="w-full flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-left hover:border-neutral-700"
              >
                <ExerciseAnimation
                  url={imageFor(entry)}
                  alt={entry.name}
                  size={64}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entry.name}</p>
                  <p className="text-[11px] text-neutral-500 truncate">
                    {[entry.equipment, entry.primary[0], entry.category]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ConfigForm({
  entry,
  programDayId,
  redirectWeek,
  onCancel,
}: {
  entry: CatalogEntry;
  programDayId: string;
  redirectWeek: number;
  onCancel: () => void;
}) {
  const [name, setName] = useState(entry.name);
  const [sets, setSets] = useState("3");
  const [baseReps, setBaseReps] = useState("10");
  const [startWeight, setStartWeight] = useState("");
  const [increment, setIncrement] = useState("2.5");
  const [progressionWeeks, setProgressionWeeks] = useState("1");
  const [tracked, setTracked] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, startSubmit] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const imgUrl = imageFor(entry);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const setsN = parseInt(sets, 10);
    const repsN = baseReps.trim() === "" ? null : parseInt(baseReps, 10);
    const startN = startWeight.trim() === "" ? null : Number(startWeight);
    const incN = Number(increment);
    const progN = parseInt(progressionWeeks, 10) || 1;
    const trimmedName = entry.custom ? name.trim() : entry.name;

    if (entry.custom && !trimmedName) {
      setErrorMsg("Name is required.");
      return;
    }
    if (!Number.isFinite(setsN) || setsN < 1) {
      setErrorMsg("Sets must be at least 1.");
      return;
    }
    if (!Number.isFinite(incN) || incN < 0) {
      setErrorMsg("Increment must be 0 or greater.");
      return;
    }
    if (progN < 1 || progN > 8) {
      setErrorMsg("Progress every N weeks must be 1–8.");
      return;
    }

    startSubmit(async () => {
      try {
        await addExerciseToProgram({
          programDayId,
          name: trimmedName,
          imageUrl: imgUrl,
          sets: setsN,
          baseReps: repsN,
          startWeight: startN,
          increment: incN,
          tracked,
          note: note.trim() === "" ? null : note.trim(),
          progressionWeeks: progN,
          redirectWeek,
        });
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Failed to save.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3 flex items-center gap-3">
        <ExerciseAnimation url={imgUrl} alt={entry.name} size={64} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            {entry.custom ? "Custom exercise" : entry.name}
          </p>
          <p className="text-[11px] text-neutral-500 truncate">
            {entry.custom
              ? "Using app logo"
              : [entry.equipment, entry.primary[0]]
                  .filter(Boolean)
                  .join(" · ")}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-neutral-400 underline"
        >
          Change
        </button>
      </div>

      {entry.custom ? (
        <Field label="Name" htmlFor="name">
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            autoFocus
            className={fieldClass}
          />
        </Field>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Sets" htmlFor="sets">
          <input
            id="sets"
            type="text"
            inputMode="numeric"
            value={sets}
            onChange={(e) => setSets(e.target.value.replace(/[^\d]/g, ""))}
            className={fieldClass}
          />
        </Field>
        <Field label="Reps (blank for time)" htmlFor="reps">
          <input
            id="reps"
            type="text"
            inputMode="numeric"
            value={baseReps}
            onChange={(e) => setBaseReps(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="—"
            className={fieldClass}
          />
        </Field>
        <Field label="Start weight (lb, blank=BW)" htmlFor="weight">
          <input
            id="weight"
            type="text"
            inputMode="decimal"
            value={startWeight}
            onChange={(e) => setStartWeight(e.target.value)}
            placeholder="—"
            className={fieldClass}
          />
        </Field>
        <Field label="Increment (lb)" htmlFor="inc">
          <input
            id="inc"
            type="text"
            inputMode="decimal"
            value={increment}
            onChange={(e) => setIncrement(e.target.value)}
            className={fieldClass}
          />
        </Field>
        <Field label="Progress every N weeks" htmlFor="prog">
          <input
            id="prog"
            type="text"
            inputMode="numeric"
            value={progressionWeeks}
            onChange={(e) =>
              setProgressionWeeks(e.target.value.replace(/[^\d]/g, ""))
            }
            className={fieldClass}
          />
        </Field>
      </div>

      <Field label="Note (optional)" htmlFor="note">
        <input
          id="note"
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="per side, 45 sec hold, …"
          className={fieldClass}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-neutral-300">
        <input
          type="checkbox"
          checked={tracked}
          onChange={(e) => setTracked(e.target.checked)}
          className="w-4 h-4 accent-emerald-500"
        />
        Track as a primary lift (highlighted on Today)
      </label>

      {errorMsg ? <p className="text-sm text-red-400">{errorMsg}</p> : null}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-12 px-4 rounded-md border border-neutral-800 text-sm flex-1"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={submitting}
          className={cn(
            "h-12 rounded-md bg-accent text-accent-foreground font-medium text-sm flex-1",
            submitting && "opacity-50"
          )}
        >
          {submitting ? "Adding…" : "Add to day"}
        </button>
      </div>
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

function CustomFallback({
  query,
  onPick,
}: {
  query: string;
  onPick: (name: string) => void;
}) {
  const trimmed = query.trim();
  if (!trimmed) {
    return <p className="text-sm text-neutral-500">No matches.</p>;
  }
  return (
    <div className="space-y-2">
      <p className="text-sm text-neutral-500">No matches in catalog.</p>
      <button
        type="button"
        onClick={() => onPick(trimmed)}
        className="w-full flex items-center gap-3 rounded-lg border border-dashed border-neutral-700 bg-neutral-900 p-3 text-left hover:border-neutral-600"
      >
        <ExerciseAnimation url={CUSTOM_IMG} alt="" size={48} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            Use &ldquo;{trimmed}&rdquo; as custom exercise
          </p>
          <p className="text-[11px] text-neutral-500">
            App logo will be used as the picture
          </p>
        </div>
      </button>
    </div>
  );
}
