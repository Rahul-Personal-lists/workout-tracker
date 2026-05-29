"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/format";
import {
  deleteSetLog,
  finishWorkout,
  logSet,
  recordSessionPhotos,
} from "@/app/actions/workout";
import { setExerciseOrder } from "@/app/actions/program";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { RestTimerBar } from "@/components/rest-timer";
import { DayNotePopover } from "@/components/day-note-popover";
import { useRestTimer } from "@/lib/stores/rest-timer";
import { createClient } from "@/lib/supabase/client";
import type { PreviousDayNote } from "@/lib/queries";
import {
  MAX_PHOTO_BYTES,
  PHOTO_BUCKET,
  isLikelyImage,
  photoContentType,
  photoExt,
} from "@/lib/photo-upload";
import type { Units } from "@/lib/units";
import type { ExerciseRow, SetRow } from "./types";
import { ExerciseCard } from "./exercise-card";
import { FinishSheet } from "./finish-sheet";

type Props = {
  sessionId: string;
  dayId: string;
  startedAt: string;
  weekNumber: number;
  dayLabel: string;
  dayTitle: string;
  exercises: ExerciseRow[];
  previousDayNote: PreviousDayNote | null;
  units: Units;
};

export function WorkoutClient({
  sessionId,
  dayId,
  startedAt,
  weekNumber,
  dayLabel,
  dayTitle,
  exercises: initialExercises,
  previousDayNote,
  units,
}: Props) {
  const router = useRouter();
  const [exercises, setExercises] = useState(initialExercises);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  const [elapsed, setElapsed] = useState(0);
  const [finishing, startFinish] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [notes, setNotes] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [finishedSuccessfully, setFinishedSuccessfully] = useState(false);
  // Drag-to-reorder lands in program_exercises.order_index via setExerciseOrder.
  // Without feedback the user can't tell whether the write succeeded — surface
  // it briefly as a toast, then auto-clear.
  const [reorderToast, setReorderToast] = useState<
    "saved" | "error" | null
  >(null);
  const startRest = useRestTimer((s) => s.start);

  useEffect(() => {
    if (reorderToast === null) return;
    const id = setTimeout(() => setReorderToast(null), 2200);
    return () => clearTimeout(id);
  }, [reorderToast]);

  useEffect(() => {
    function compute() {
      const startMs = new Date(startedAt).getTime();
      setElapsed(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    }
    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const visibleExercises = useMemo(
    () => exercises.filter((e) => !hiddenIds.has(e.id)),
    [exercises, hiddenIds]
  );

  const completedCount = useMemo(
    () =>
      visibleExercises.flatMap((e) => e.sets).filter((s) => s.completed).length,
    [visibleExercises]
  );
  const totalSetsCount = useMemo(
    () => visibleExercises.reduce((acc, e) => acc + e.sets.length, 0),
    [visibleExercises]
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
              actualSeconds: last?.actualSeconds ?? ex.plannedSeconds,
              completed: false,
            },
          ],
        };
      })
    );
  }

  function removeSet(exerciseId: string, setNumber: number) {
    const snapshot = exercises;
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id !== exerciseId
          ? ex
          : { ...ex, sets: ex.sets.filter((s) => s.setNumber !== setNumber) }
      )
    );
    // Always call — the action no-ops if no set_log row exists yet. Set numbers
    // are not renumbered; logSet upserts on (session, exercise, set_number)
    // and tolerates gaps.
    deleteSetLog({
      sessionId,
      programExerciseId: exerciseId,
      setNumber,
    }).catch((err) => {
      console.error("deleteSetLog failed", err);
      setExercises(snapshot);
    });
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const snapshot = exercises;
    const oldIdx = exercises.findIndex((x) => x.id === active.id);
    const newIdx = exercises.findIndex((x) => x.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const next = arrayMove(exercises, oldIdx, newIdx);
    setExercises(next);
    setExerciseOrder({ dayId, orderedIds: next.map((x) => x.id) })
      .then(() => setReorderToast("saved"))
      .catch((err) => {
        console.error("setExerciseOrder failed", err);
        setExercises(snapshot);
        setReorderToast("error");
      });
  }

  function hideExercise(id: string) {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  async function persistSet(exercise: ExerciseRow, set: SetRow) {
    const isTime = exercise.kind === "time";
    try {
      await logSet({
        sessionId,
        programExerciseId: exercise.id,
        setNumber: set.setNumber,
        plannedWeight: isTime ? null : exercise.plannedWeight,
        plannedReps: isTime ? null : exercise.plannedReps,
        actualWeight: isTime ? null : set.actualWeight,
        actualReps: isTime ? null : set.actualReps,
        plannedSeconds: isTime ? exercise.plannedSeconds : null,
        actualSeconds: isTime ? set.actualSeconds : null,
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
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setUploadError("Not signed in — couldn't upload photos.");
          return;
        }

        const uploadedPaths: string[] = [];
        let failed = 0;
        let firstError: string | null = null;

        for (const file of photos) {
          try {
            if (file.size > MAX_PHOTO_BYTES) {
              const mb = (file.size / 1024 / 1024).toFixed(1);
              throw new Error(`Photo too large (${mb} MB). Max is 25 MB.`);
            }
            if (!isLikelyImage(file)) {
              throw new Error(
                `Unsupported file: ${file.name || "(unnamed)"} (${file.type || "unknown type"}).`
              );
            }
            const ext = photoExt(file);
            const path = `${user.id}/${sessionId}/${crypto.randomUUID()}.${ext}`;
            const contentType = photoContentType(file, ext);
            const { error: upErr } = await supabase.storage
              .from(PHOTO_BUCKET)
              .upload(path, file, { contentType, upsert: false });
            if (upErr) throw upErr;
            uploadedPaths.push(path);
          } catch (err) {
            failed += 1;
            if (firstError === null) {
              firstError = err instanceof Error ? err.message : "Photo upload failed";
            }
          }
        }

        if (uploadedPaths.length > 0) {
          try {
            await recordSessionPhotos({ sessionId, paths: uploadedPaths });
          } catch (err) {
            await supabase.storage.from(PHOTO_BUCKET).remove(uploadedPaths);
            const msg = err instanceof Error ? err.message : "Couldn't save photos";
            setUploadError(msg);
            return;
          }
        }

        if (failed > 0) {
          const total = uploadedPaths.length + failed;
          const msg =
            uploadedPaths.length > 0
              ? `${uploadedPaths.length} of ${total} photos uploaded — ${failed} failed${firstError ? `: ${firstError}` : ""}.`
              : `Photos didn't upload${firstError ? `: ${firstError}` : ""}.`;
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
    <div className="space-y-5 pb-28">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-neutral-500">
          Week {weekNumber} · {dayLabel}
        </p>
        <div className="flex items-center justify-between gap-3">
          <h1 className="flex items-center gap-1.5 text-xl font-semibold leading-tight">
            <span>{dayTitle}</span>
            {previousDayNote ? (
              <DayNotePopover
                notes={previousDayNote.notes}
                startedAt={previousDayNote.startedAt}
                weekNumber={previousDayNote.weekNumber}
              />
            ) : null}
          </h1>
          <span className="text-sm tabular-nums text-neutral-300">
            {formatDuration(elapsed)}
          </span>
        </div>
        <p className="text-xs text-neutral-500">
          {completedCount}/{totalSetsCount} sets done
        </p>
      </header>

      <RestTimerBar />

      <p className="text-[11px] text-foreground-muted">
        Tip: swipe a set left to delete it.
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={visibleExercises.map((x) => x.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-3">
            {visibleExercises.map((ex) => (
              <ExerciseCard
                key={ex.id}
                exercise={ex}
                units={units}
                onChange={(setNumber, patch, persist) => {
                  const prev = ex.sets.find((s) => s.setNumber === setNumber);
                  updateSet(ex.id, setNumber, patch);
                  if (persist && prev) persistSet(ex, { ...prev, ...patch });
                  if (patch.completed === true && prev && !prev.completed) {
                    startRest();
                  }
                }}
                onAddSet={() => addSet(ex.id)}
                onDeleteSet={(setNumber) => removeSet(ex.id, setNumber)}
                onHide={() => hideExercise(ex.id)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <Link
        href={`/program/add?day=${dayId}&week=${weekNumber}&returnTo=/workout/${sessionId}`}
        className="btn-ghost-add h-12 text-sm"
      >
        <Plus className="w-4 h-4" /> Add exercise
      </Link>

      {reorderToast ? (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "fixed left-1/2 -translate-x-1/2 z-40 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg border",
            // Sit above the Finish/RestTimer footer (~7rem + safe-area).
            "bottom-[calc(env(safe-area-inset-bottom)+7rem)]",
            reorderToast === "saved"
              ? "bg-accent/15 border-accent/40 text-accent"
              : "bg-red-500/15 border-red-500/40 text-red-300"
          )}
        >
          {reorderToast === "saved"
            ? "Order saved"
            : "Couldn't save order — reverted."}
        </div>
      ) : null}

      <div className="fixed bottom-0 inset-x-0 z-30 bg-gradient-to-t from-black via-black/95 to-transparent pt-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] px-4">
        <div className="max-w-md mx-auto space-y-3">
          <RestTimerBar floating />
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
