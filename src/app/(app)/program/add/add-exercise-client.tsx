"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Search, Video, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExerciseAnimation } from "@/components/exercise-animation";
import { ExerciseMedia } from "@/components/exercise-media";
import { MuscleBadge } from "@/components/muscle-badge";
import { regionsFromCatalogMuscles } from "@/lib/muscle-regions";
import { addExerciseToProgram } from "@/app/actions/program";
import { parseDuration } from "@/lib/format";
import {
  type CatalogEntry,
  MUSCLE_GROUPS,
  CUSTOM_IMG,
  imageForCatalogEntry,
  loadCatalog,
  getCachedCatalog,
} from "@/lib/exercise-catalog";

export function AddExerciseClient({
  programDayId,
  redirectWeek,
  returnTo,
  initialCustom = [],
}: {
  programDayId: string;
  redirectWeek: number;
  returnTo: string | null;
  initialCustom?: CatalogEntry[];
}) {
  const [catalog, setCatalog] = useState<CatalogEntry[] | null>(
    getCachedCatalog()
  );
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CatalogEntry | null>(null);
  const [activeMuscles, setActiveMuscles] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (catalog) return;
    let cancelled = false;
    loadCatalog().then((d) => {
      if (!cancelled) setCatalog(d);
    });
    return () => {
      cancelled = true;
    };
  }, [catalog]);

  // Return here after creating a custom exercise so the new clip shows in search.
  const addUrl = `/program/add?day=${programDayId}&week=${redirectWeek}${
    returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ""
  }`;
  const createHref = `/program/exercises/new?returnTo=${encodeURIComponent(addUrl)}`;

  const hasFilters = query.trim() !== "" || activeMuscles.size > 0;

  const filtered = useMemo(() => {
    if (!catalog) return [];
    // The user's custom exercises (incl. video clips) lead the catalog so they
    // surface in search alongside the built-ins.
    const all = [...initialCustom, ...catalog];
    const q = query.trim().toLowerCase();
    const tokens = q ? q.split(/\s+/) : [];

    const muscleMatchers = MUSCLE_GROUPS.filter((g) =>
      activeMuscles.has(g.label)
    );

    if (!hasFilters) {
      return all.slice(0, 30 + initialCustom.length);
    }

    return all
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
  }, [catalog, initialCustom, query, activeMuscles, hasFilters]);

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
        returnTo={returnTo}
        onCancel={() => setSelected(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search exercises…"
          autoFocus
          className="w-full h-12 rounded-md bg-surface border border-border pl-9 pr-3 text-base outline-none focus:border-neutral-600"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wide text-foreground-muted">
            Muscle group
          </span>
          {activeMuscles.size > 0 ? (
            <button
              type="button"
              onClick={() => setActiveMuscles(new Set())}
              className="text-[11px] text-foreground-muted inline-flex items-center gap-1"
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
                    : "border-border bg-surface text-foreground-muted"
                )}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      </div>

      <Link
        href={createHref}
        className="flex items-center gap-2 rounded-lg border border-dashed border-border-strong bg-surface p-3 text-sm text-foreground-muted hover:border-neutral-600"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
          <Plus className="w-4 h-4" />
        </span>
        Create a custom exercise from a video
      </Link>

      {catalog === null ? (
        <p className="text-sm text-foreground-muted">Loading catalog…</p>
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
                className="w-full flex items-center gap-3 rounded-lg border border-border bg-surface p-2 text-left hover:border-border-strong"
              >
                <ExerciseMedia
                  imageUrl={imageForCatalogEntry(entry)}
                  poster={entry.video ? entry.posterUrl ?? null : null}
                  alt={entry.name}
                  size={64}
                />
                <MuscleBadge
                  regions={regionsFromCatalogMuscles(entry.primary)}
                  size={30}
                  className="shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entry.name}</p>
                  <p className="text-[11px] text-foreground-muted truncate flex items-center gap-1">
                    {entry.video ? (
                      <span className="inline-flex items-center gap-0.5 text-accent">
                        <Video className="w-3 h-3" /> Video
                      </span>
                    ) : null}
                    <span className="truncate">
                      {[entry.equipment, entry.primary[0], entry.category]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
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
  returnTo,
  onCancel,
}: {
  entry: CatalogEntry;
  programDayId: string;
  redirectWeek: number;
  returnTo: string | null;
  onCancel: () => void;
}) {
  const [name, setName] = useState(entry.name);
  const isTimeDefault = entry.category === "cardio" || entry.force === "static";
  const [kind, setKind] = useState<"reps" | "time">(
    isTimeDefault ? "time" : "reps"
  );
  const [sets, setSets] = useState(entry.category === "cardio" ? "1" : "3");
  const [baseReps, setBaseReps] = useState("10");
  const [startWeight, setStartWeight] = useState("");
  const [increment, setIncrement] = useState("2.5");
  const [progressionWeeks, setProgressionWeeks] = useState("1");
  const [duration, setDuration] = useState(
    entry.category === "cardio" ? "10:00" : "1:00"
  );
  const [tracked, setTracked] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, startSubmit] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const imgUrl = imageForCatalogEntry(entry);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const setsN = parseInt(sets, 10);
    const trimmedName = entry.custom ? name.trim() : entry.name;
    const progN = parseInt(progressionWeeks, 10) || 1;

    if (entry.custom && !trimmedName) {
      setErrorMsg("Name is required.");
      return;
    }
    if (!Number.isFinite(setsN) || setsN < 1) {
      setErrorMsg("Sets must be at least 1.");
      return;
    }

    let repsN: number | null = null;
    let startN: number | null = null;
    let incN = 0;
    let targetSecondsN: number | null = null;

    if (kind === "time") {
      targetSecondsN = parseDuration(duration);
      if (targetSecondsN === null) {
        setErrorMsg("Duration must be a positive time like 1:30 or 90.");
        return;
      }
    } else {
      repsN = baseReps.trim() === "" ? null : parseInt(baseReps, 10);
      startN = startWeight.trim() === "" ? null : Number(startWeight);
      incN = Number(increment);
      if (!Number.isFinite(incN) || incN < 0) {
        setErrorMsg("Increment must be 0 or greater.");
        return;
      }
      if (progN < 1 || progN > 8) {
        setErrorMsg("Progress every N weeks must be 1–8.");
        return;
      }
    }

    const video = entry.video;
    // Photo-only customs have no video but a durable poster_path. Snapshot the
    // poster path + custom id so the program row keeps showing the photo (a
    // signed URL would expire). For video customs, image_url is just a fallback.
    const isCustom = !!entry.custom;
    const posterPath = video?.posterPath ?? (isCustom ? entry.posterPath ?? null : null);
    const customId = video?.customExerciseId ?? (isCustom ? entry.id : null);
    const hasCustomMedia = !!video || (isCustom && !!posterPath);
    startSubmit(async () => {
      try {
        await addExerciseToProgram({
          programDayId,
          name: trimmedName,
          imageUrl: hasCustomMedia ? CUSTOM_IMG : imgUrl,
          sets: setsN,
          baseReps: repsN,
          startWeight: startN,
          increment: incN,
          tracked,
          note: note.trim() === "" ? null : note.trim(),
          progressionWeeks: progN,
          kind,
          targetSeconds: targetSecondsN,
          redirectWeek,
          returnTo: returnTo ?? undefined,
          customExerciseId: customId,
          videoPath: video?.videoPath ?? null,
          posterPath,
          cropRect: video?.rect ?? null,
          trimStartSeconds: video?.trim?.startSec ?? null,
          trimEndSeconds: video?.trim?.endSec ?? null,
          aspectRatio: video?.aspect ?? null,
          muscles: isCustom ? entry.primary : [],
        });
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Failed to save.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="rounded-lg border border-border bg-surface p-3 flex items-center gap-3">
        <ExerciseMedia
          imageUrl={imgUrl}
          poster={entry.video ? entry.posterUrl ?? null : null}
          alt={entry.name}
          size={64}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{entry.name}</p>
          <p className="text-[11px] text-foreground-muted truncate">
            {entry.custom
              ? entry.video
                ? "Custom video"
                : "Custom photo"
              : [entry.equipment, entry.primary[0]]
                  .filter(Boolean)
                  .join(" · ")}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-foreground-muted underline"
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

      <div className="space-y-1">
        <span className="block text-[11px] uppercase tracking-wide text-foreground-muted">
          Track as
        </span>
        <div className="grid grid-cols-2 gap-1 rounded-md bg-surface border border-border p-1">
          {(["reps", "time"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={cn(
                "h-9 rounded text-sm font-medium transition-colors",
                kind === k
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground-muted hover:text-foreground"
              )}
            >
              {k === "reps" ? "Reps + weight" : "Time"}
            </button>
          ))}
        </div>
      </div>

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
        {kind === "time" ? (
          <Field label="Duration (mm:ss)" htmlFor="duration">
            <input
              id="duration"
              type="text"
              inputMode="numeric"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="1:00"
              className={fieldClass}
            />
          </Field>
        ) : (
          <>
            <Field label="Reps" htmlFor="reps">
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
          </>
        )}
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

      <label className="flex items-center gap-2 text-sm text-foreground-muted">
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
          className="h-12 px-4 rounded-md border border-border text-sm flex-1"
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
  "w-full h-11 rounded-md bg-surface border border-border px-3 text-base outline-none focus:border-neutral-600";

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
      <span className="block text-[11px] uppercase tracking-wide text-foreground-muted">
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
    return <p className="text-sm text-foreground-muted">No matches.</p>;
  }
  return (
    <div className="space-y-2">
      <p className="text-sm text-foreground-muted">No matches in catalog.</p>
      <button
        type="button"
        onClick={() => onPick(trimmed)}
        className="w-full flex items-center gap-3 rounded-lg border border-dashed border-border-strong bg-surface p-3 text-left hover:border-neutral-600"
      >
        <ExerciseAnimation url={CUSTOM_IMG} alt="" size={48} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            Use &ldquo;{trimmed}&rdquo; as custom exercise
          </p>
          <p className="text-[11px] text-foreground-muted">
            App logo will be used as the picture
          </p>
        </div>
      </button>
    </div>
  );
}
