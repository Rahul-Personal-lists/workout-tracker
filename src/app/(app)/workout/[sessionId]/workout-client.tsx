"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration, formatWeight } from "@/lib/format";
import { finishWorkout, logSet, uploadSessionPhotos } from "@/app/actions/workout";
import { RestTimerBar } from "@/components/rest-timer";
import { ExerciseAnimation } from "@/components/exercise-animation";
import { useRestTimer } from "@/lib/stores/rest-timer";

export type SetRow = {
  setNumber: number;
  actualWeight: number | null;
  actualReps: number | null;
  completed: boolean;
};

export type ExerciseRow = {
  id: string;
  name: string;
  note: string | null;
  imageUrl: string | null;
  plannedWeight: number | null;
  plannedReps: number | null;
  lastWeight: number | null;
  lastReps: number | null;
  sets: SetRow[];
};

type Props = {
  sessionId: string;
  startedAt: string;
  weekNumber: number;
  dayLabel: string;
  dayTitle: string;
  exercises: ExerciseRow[];
};

export function WorkoutClient({
  sessionId,
  startedAt,
  weekNumber,
  dayLabel,
  dayTitle,
  exercises: initialExercises,
}: Props) {
  const router = useRouter();
  const [exercises, setExercises] = useState(initialExercises);
  const [elapsed, setElapsed] = useState(0);
  const [finishing, startFinish] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [notes, setNotes] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [finishedSuccessfully, setFinishedSuccessfully] = useState(false);
  const startRest = useRestTimer((s) => s.start);

  useEffect(() => {
    const tick = () =>
      setElapsed(
        Math.max(
          0,
          Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
        )
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const completedCount = useMemo(
    () => exercises.flatMap((e) => e.sets).filter((s) => s.completed).length,
    [exercises]
  );
  const totalSetsCount = useMemo(
    () => exercises.reduce((acc, e) => acc + e.sets.length, 0),
    [exercises]
  );

  function updateSet(
    exerciseId: string,
    setNumber: number,
    patch: Partial<SetRow>
  ) {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id !== exerciseId
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s) =>
                s.setNumber === setNumber ? { ...s, ...patch } : s
              ),
            }
      )
    );
  }

  function addSet(exerciseId: string) {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        const nextNumber =
          ex.sets.reduce((m, s) => Math.max(m, s.setNumber), 0) + 1;
        const last = ex.sets[ex.sets.length - 1];
        return {
          ...ex,
          sets: [
            ...ex.sets,
            {
              setNumber: nextNumber,
              actualWeight: last?.actualWeight ?? ex.plannedWeight,
              actualReps: last?.actualReps ?? ex.plannedReps,
              completed: false,
            },
          ],
        };
      })
    );
  }

  async function persistSet(exercise: ExerciseRow, set: SetRow) {
    try {
      await logSet({
        sessionId,
        programExerciseId: exercise.id,
        setNumber: set.setNumber,
        plannedWeight: exercise.plannedWeight,
        plannedReps: exercise.plannedReps,
        actualWeight: set.actualWeight,
        actualReps: set.actualReps,
        completed: set.completed,
      });
    } catch (err) {
      console.error("logSet failed", err);
    }
  }

  function addPhotos(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list);
    setPhotos((prev) => [...prev, ...incoming].slice(0, 6));
  }

  function removePhoto(idx: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  }

  function confirmFinish() {
    setUploadError(null);
    startFinish(async () => {
      // Commit the workout first so ended_at + notes are durable even if
      // the photo upload later fails. finishWorkout is idempotent.
      try {
        await finishWorkout({
          sessionId,
          notes: notes.trim() ? notes.trim() : undefined,
        });
        setFinishedSuccessfully(true);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Couldn't save workout";
        setUploadError(msg);
        return;
      }

      if (photos.length > 0) {
        const fd = new FormData();
        fd.set("sessionId", sessionId);
        photos.forEach((p) => fd.append("photos", p));
        try {
          const result = await uploadSessionPhotos(fd);
          if (result.failed > 0) {
            const total = result.uploaded + result.failed;
            const msg =
              result.uploaded > 0
                ? `${result.uploaded} of ${total} photos uploaded — ${result.failed} failed${result.firstError ? `: ${result.firstError}` : ""}.`
                : `Photos didn't upload${result.firstError ? `: ${result.firstError}` : ""}.`;
            setUploadError(msg);
            return;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Photos didn't upload";
          setUploadError(msg);
          return;
        }
      }

      router.push(`/history/${sessionId}`);
    });
  }

  function skipAndContinue() {
    router.push(`/history/${sessionId}`);
  }

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-neutral-500">
          Week {weekNumber} · {dayLabel}
        </p>
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-xl font-semibold leading-tight">{dayTitle}</h1>
          <span className="text-sm tabular-nums text-neutral-300">
            {formatDuration(elapsed)}
          </span>
        </div>
        <p className="text-xs text-neutral-500">
          {completedCount}/{totalSetsCount} sets done
        </p>
      </header>

      <RestTimerBar />

      <ul className="space-y-3">
        {exercises.map((ex) => (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            onChange={(setNumber, patch, persist) => {
              const prev = ex.sets.find((s) => s.setNumber === setNumber);
              updateSet(ex.id, setNumber, patch);
              if (persist && prev) persistSet(ex, { ...prev, ...patch });
              if (patch.completed === true && prev && !prev.completed) {
                startRest();
              }
            }}
            onAddSet={() => addSet(ex.id)}
          />
        ))}
      </ul>

      <div className="fixed bottom-0 inset-x-0 z-30 bg-gradient-to-t from-black via-black/95 to-transparent pt-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] px-4">
        <div className="max-w-md mx-auto">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            disabled={finishing}
            className={cn(
              "w-full h-14 rounded-md font-medium text-base bg-white text-black transition-colors",
              finishing && "opacity-50"
            )}
          >
            {finishing ? "Finishing…" : "Finish workout"}
          </button>
        </div>
      </div>

      {sheetOpen ? (
        <FinishSheet
          photos={photos}
          notes={notes}
          finishing={finishing}
          uploadError={uploadError}
          finishedSuccessfully={finishedSuccessfully}
          onAddPhotos={addPhotos}
          onRemovePhoto={(idx) => {
            removePhoto(idx);
            setUploadError(null);
          }}
          onChangeNotes={setNotes}
          onClose={() => setSheetOpen(false)}
          onConfirm={confirmFinish}
          onSkip={skipAndContinue}
        />
      ) : null}
    </div>
  );
}

function FinishSheet({
  photos,
  notes,
  finishing,
  uploadError,
  finishedSuccessfully,
  onAddPhotos,
  onRemovePhoto,
  onChangeNotes,
  onClose,
  onConfirm,
  onSkip,
}: {
  photos: File[];
  notes: string;
  finishing: boolean;
  uploadError: string | null;
  finishedSuccessfully: boolean;
  onAddPhotos: (list: FileList | null) => void;
  onRemovePhoto: (idx: number) => void;
  onChangeNotes: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" onClick={onClose}>
      <div
        className="w-full max-w-md bg-neutral-950 border-t border-neutral-800 rounded-t-xl px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Finish workout</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-9 w-9 -mr-2 flex items-center justify-center text-neutral-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wide text-neutral-500">
            Photos (optional)
          </label>
          {photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((file, i) => (
                <PhotoThumb key={i} file={file} onRemove={() => onRemovePhoto(i)} />
              ))}
            </div>
          ) : null}
          {photos.length < 6 ? (
            <label className="flex items-center justify-center gap-2 h-12 rounded-md border border-dashed border-neutral-700 text-sm text-neutral-300">
              <Camera className="w-4 h-4" />
              <span>{photos.length === 0 ? "Add photo" : "Add more"}</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="hidden"
                onChange={(e) => {
                  onAddPhotos(e.target.files);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wide text-neutral-500">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => onChangeNotes(e.target.value)}
            rows={2}
            className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm outline-none focus:border-neutral-600"
            placeholder="Felt strong, bumped weight on…"
          />
        </div>

        {uploadError ? (
          <p className="rounded-md border border-red-500/40 bg-red-500/10 text-red-300 text-xs px-3 py-2">
            {finishedSuccessfully ? (
              <>
                <span className="text-emerald-300">Your workout and notes are saved.</span>{" "}
              </>
            ) : null}
            {uploadError}
          </p>
        ) : null}

        {finishedSuccessfully && uploadError ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onSkip}
              disabled={finishing}
              className={cn(
                "h-12 rounded-md font-medium bg-neutral-800 text-neutral-100",
                finishing && "opacity-50"
              )}
            >
              Skip & continue
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={finishing}
              className={cn(
                "h-12 rounded-md font-medium bg-emerald-500 text-black",
                finishing && "opacity-50"
              )}
            >
              {finishing ? "Retrying…" : "Retry"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onConfirm}
            disabled={finishing}
            className={cn(
              "w-full h-12 rounded-md font-medium bg-emerald-500 text-black",
              finishing && "opacity-50"
            )}
          >
            {finishing ? "Finishing…" : "Finish workout"}
          </button>
        )}
      </div>
    </div>
  );
}

function PhotoThumb({ file, onRemove }: { file: File; onRemove: () => void }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return (
    <div className="relative aspect-square rounded-md overflow-hidden bg-neutral-900 border border-neutral-800">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="w-full h-full object-cover" />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove photo"
        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/70 text-white flex items-center justify-center"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function ExerciseCard({
  exercise,
  onChange,
  onAddSet,
}: {
  exercise: ExerciseRow;
  onChange: (
    setNumber: number,
    patch: Partial<SetRow>,
    persist: boolean
  ) => void;
  onAddSet: () => void;
}) {
  const [zoomed, setZoomed] = useState(false);
  const allComplete =
    exercise.sets.length > 0 && exercise.sets.every((s) => s.completed);
  const [expanded, setExpanded] = useState(!allComplete);
  const prevAllComplete = useRef(allComplete);
  useEffect(() => {
    if (prevAllComplete.current !== allComplete) {
      setExpanded(!allComplete);
      prevAllComplete.current = allComplete;
    }
  }, [allComplete]);

  const plannedSummary =
    exercise.plannedWeight !== null
      ? `${exercise.sets.length}×${exercise.plannedReps ?? "—"} · ${formatWeight(exercise.plannedWeight)} lb`
      : `${exercise.sets.length}×${exercise.plannedReps ?? "—"}`;

  if (allComplete && !expanded) {
    return (
      <>
        <li className="rounded-lg border border-neutral-800 bg-neutral-900/60">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-expanded={false}
            aria-label={`Expand ${exercise.name}`}
            className="w-full flex items-center gap-3 p-2.5 text-left"
          >
            <ExerciseAnimation
              url={exercise.imageUrl}
              alt={exercise.name}
              size={40}
            />
            <div className="flex-1 min-w-0 flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium truncate">{exercise.name}</span>
              <span className="flex items-center gap-1 text-[11px] text-neutral-400 tabular-nums whitespace-nowrap">
                {plannedSummary}
                <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
              </span>
            </div>
            <span className="h-6 w-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Check className="w-3.5 h-3.5" strokeWidth={3} />
            </span>
          </button>
        </li>
      </>
    );
  }

  return (
    <>
    <li className="rounded-lg border border-neutral-800 bg-neutral-900 p-3 space-y-2">
      <div className="flex items-start gap-3">
        {exercise.imageUrl ? (
          <button
            type="button"
            onClick={() => setZoomed(true)}
            aria-label={`View ${exercise.name} animation`}
            className="shrink-0 rounded focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          >
            <ExerciseAnimation url={exercise.imageUrl} alt={exercise.name} size={64} />
          </button>
        ) : (
          <ExerciseAnimation url={exercise.imageUrl} alt={exercise.name} size={64} />
        )}
        <button
          type="button"
          onClick={allComplete ? () => setExpanded(false) : undefined}
          aria-expanded={allComplete ? true : undefined}
          aria-label={allComplete ? `Collapse ${exercise.name}` : undefined}
          disabled={!allComplete}
          className="flex-1 min-w-0 space-y-0.5 text-left disabled:cursor-default"
        >
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-medium leading-snug">{exercise.name}</h2>
            <span className="flex items-center gap-1 text-[11px] text-neutral-400 tabular-nums whitespace-nowrap">
              {plannedSummary}
              {allComplete ? (
                <ChevronUp className="w-3.5 h-3.5 text-neutral-500" />
              ) : null}
            </span>
          </div>
          {exercise.note ? (
            <p className="text-[11px] text-neutral-500">{exercise.note}</p>
          ) : null}
        </button>
      </div>

      <div className="space-y-1.5">
        <div className="grid grid-cols-[1fr_1fr_44px] gap-2 px-2 text-[10px] uppercase tracking-wide text-neutral-500">
          <span className="text-center">Lb</span>
          <span className="text-center">Reps</span>
          <span />
        </div>
        {exercise.sets.map((set) => (
          <SetInputRow
            key={set.setNumber}
            set={set}
            lastWeight={exercise.lastWeight}
            lastReps={exercise.lastReps}
            onChange={(patch, persist) => onChange(set.setNumber, patch, persist)}
          />
        ))}
        <button
          type="button"
          onClick={onAddSet}
          className="flex items-center justify-center gap-1.5 w-full h-9 rounded-md border border-dashed border-neutral-700 text-xs text-neutral-400 hover:border-neutral-600 hover:text-neutral-300 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add set
        </button>
      </div>
    </li>
    {zoomed && exercise.imageUrl ? (
      <div
        onClick={() => setZoomed(false)}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${exercise.name} animation`}
          onClick={(e) => e.stopPropagation()}
          className="relative bg-neutral-950 border border-neutral-800 rounded-xl p-4 max-w-sm w-full flex flex-col items-center gap-3"
        >
          <button
            type="button"
            onClick={() => setZoomed(false)}
            aria-label="Close"
            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/70 text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
          <ExerciseAnimation url={exercise.imageUrl} alt={exercise.name} size={288} />
          <p className="text-sm text-neutral-300 text-center">{exercise.name}</p>
        </div>
      </div>
    ) : null}
    </>
  );
}

function SetInputRow({
  set,
  lastWeight,
  lastReps,
  onChange,
}: {
  set: SetRow;
  lastWeight: number | null;
  lastReps: number | null;
  onChange: (patch: Partial<SetRow>, persist: boolean) => void;
}) {
  const [weightStr, setWeightStr] = useState(
    set.actualWeight !== null ? formatWeight(set.actualWeight) : ""
  );
  const [repsStr, setRepsStr] = useState(
    set.actualReps !== null ? String(set.actualReps) : ""
  );
  const weightStrRef = useRef(weightStr);
  const repsStrRef = useRef(repsStr);
  useEffect(() => {
    weightStrRef.current = weightStr;
  }, [weightStr]);
  useEffect(() => {
    repsStrRef.current = repsStr;
  }, [repsStr]);

  function commitOnBlur() {
    const w = weightStrRef.current.trim();
    const r = repsStrRef.current.trim();
    const parsedW = w === "" ? null : Number(w);
    const parsedR = r === "" ? null : parseInt(r, 10);
    const validW = parsedW === null || Number.isFinite(parsedW) ? parsedW : null;
    const validR = parsedR === null || Number.isFinite(parsedR) ? parsedR : null;
    if (validW !== set.actualWeight || validR !== set.actualReps) {
      onChange(
        { actualWeight: validW, actualReps: validR },
        set.completed // only persist if already marked done
      );
    }
  }

  function toggleComplete() {
    const next = !set.completed;
    const parsedW = weightStrRef.current.trim() === "" ? null : Number(weightStrRef.current);
    const parsedR = repsStrRef.current.trim() === "" ? null : parseInt(repsStrRef.current, 10);
    const validW = Number.isFinite(parsedW as number) ? (parsedW as number) : null;
    const validR = Number.isFinite(parsedR as number) ? (parsedR as number) : null;
    onChange(
      { completed: next, actualWeight: validW, actualReps: validR },
      true
    );
  }

  const hint =
    !set.completed && lastWeight !== null
      ? `last: ${formatWeight(lastWeight)} × ${lastReps ?? "—"}`
      : null;

  return (
    <div
      className={cn(
        "grid grid-cols-[1fr_1fr_44px] items-center gap-2 rounded-md px-2 py-1.5",
        set.completed ? "bg-neutral-800/60" : "bg-neutral-950"
      )}
    >
      <label className="flex flex-col min-w-0">
        <input
          type="text"
          inputMode="decimal"
          enterKeyHint="next"
          value={weightStr}
          onChange={(e) => setWeightStr(e.target.value)}
          onBlur={commitOnBlur}
          placeholder="lb"
          className={cn(
            "w-full min-w-0 h-11 rounded bg-transparent text-base px-2 text-center tabular-nums outline-none border border-transparent focus:border-neutral-700",
            set.completed && "text-neutral-400"
          )}
        />
        {hint ? (
          <span className="text-[10px] text-neutral-500 px-1 -mt-0.5">{hint}</span>
        ) : null}
      </label>
      <input
        type="text"
        inputMode="numeric"
        enterKeyHint="done"
        value={repsStr}
        onChange={(e) => setRepsStr(e.target.value.replace(/[^\d]/g, ""))}
        onBlur={commitOnBlur}
        placeholder="reps"
        className={cn(
          "w-full min-w-0 h-11 rounded bg-transparent text-base px-2 text-center tabular-nums outline-none border border-transparent focus:border-neutral-700",
          set.completed && "text-neutral-400"
        )}
      />
      <button
        type="button"
        aria-label={set.completed ? "Mark set incomplete" : "Mark set complete"}
        onClick={toggleComplete}
        className={cn(
          "h-11 w-11 rounded-md flex items-center justify-center border transition-colors",
          set.completed
            ? "bg-emerald-500 border-emerald-500 text-black"
            : "border-neutral-700 text-neutral-500"
        )}
      >
        <Check className="w-5 h-5" strokeWidth={3} />
      </button>
    </div>
  );
}
