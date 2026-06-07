"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  EyeOff,
  GripVertical,
  Plus,
  X,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { formatDuration, formatWeight, unitLabel } from "@/lib/format";
import type { Units } from "@/lib/units";
import type { StepLead } from "@/lib/step-cue";
import { ExerciseAnimation } from "@/components/exercise-animation";
import { ExerciseMedia } from "@/components/exercise-media";
import { VideoExercisePlayer } from "@/components/video-exercise-player";
import { SwipeRow } from "@/components/swipe-row";
import { useDialog } from "@/lib/use-dialog";
import { signCustomVideoUrl } from "@/app/actions/custom-exercise";
import type { VideoMedia } from "@/lib/video-upload";
import type { ExerciseRow, SetRow } from "./types";
import { SetInputRow } from "./set-input-row";
import { TimeSetInputRow } from "./time-set-input-row";

export function ExerciseCard({
  sessionId,
  exercise,
  units,
  soundLead,
  vibrationLead,
  onChange,
  onAddSet,
  onDeleteSet,
  onHide,
}: {
  sessionId: string;
  exercise: ExerciseRow;
  units: Units;
  soundLead: StepLead;
  vibrationLead: StepLead;
  onChange: (
    setNumber: number,
    patch: Partial<SetRow>,
    persist: boolean
  ) => void;
  onAddSet: () => void;
  onDeleteSet: (setNumber: number) => void;
  onHide: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.id });
  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };
  const [zoomed, setZoomed] = useState(false);
  const zoomDialogRef = useDialog<HTMLDivElement>(zoomed, () => setZoomed(false));
  const videoMedia: VideoMedia | null =
    exercise.mediaKind === "video" && exercise.videoUrl
      ? {
          videoUrl: exercise.videoUrl,
          posterUrl: exercise.posterUrl,
          rect: exercise.rect,
          trim: exercise.trim,
          aspect: exercise.aspect,
        }
      : null;
  const posterForThumb = videoMedia ? exercise.posterUrl : null;
  const hasMedia = !!exercise.imageUrl || !!videoMedia;
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

  const isTime = exercise.kind === "time";
  const plannedSummary = isTime
    ? `${exercise.sets.length} × ${exercise.plannedSeconds !== null ? formatDuration(exercise.plannedSeconds) : "—"}`
    : exercise.plannedWeight !== null
      ? `${exercise.sets.length}×${exercise.plannedReps ?? "—"} · ${formatWeight(exercise.plannedWeight, units)}`
      : `${exercise.sets.length}×${exercise.plannedReps ?? "—"}`;

  if (allComplete && !expanded) {
    return (
      <li ref={setNodeRef} style={sortableStyle}>
        <SwipeRow
          onAction={onHide}
          actionLabel="Hide"
          actionTone="neutral"
          actionIcon={<EyeOff className="w-3.5 h-3.5" />}
          className="rounded-2xl"
        >
          <div
            className={cn(
              "rounded-2xl border border-border bg-surface-subtle flex items-stretch",
              isDragging && "shadow-lg ring-1 ring-border bg-surface-hover"
            )}
          >
            <button
              type="button"
              onClick={() => setExpanded(true)}
              aria-expanded={false}
              aria-label={`Expand ${exercise.name}`}
              className="flex-1 min-w-0 flex items-center gap-3 p-2.5 text-left"
            >
              <ExerciseMedia
                imageUrl={exercise.imageUrl}
                poster={posterForThumb}
                alt={exercise.name}
                size={40}
              />
              <div className="flex-1 min-w-0 flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium truncate">{exercise.name}</span>
                <span className="flex items-center gap-1 text-[11px] text-foreground-muted tabular-nums whitespace-nowrap">
                  {plannedSummary}
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
                </span>
              </div>
              <span className="h-6 w-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
              </span>
            </button>
            <DragHandle
              attributes={attributes}
              listeners={listeners}
              name={exercise.name}
            />
          </div>
        </SwipeRow>
      </li>
    );
  }

  return (
    <>
    <li ref={setNodeRef} style={sortableStyle}>
      <SwipeRow
        onAction={onHide}
        actionLabel="Hide"
        actionTone="neutral"
        actionIcon={<EyeOff className="w-3.5 h-3.5" />}
        className="rounded-2xl"
      >
        <div
          className={cn(
            "rounded-2xl border border-border bg-surface p-3 space-y-2",
            isDragging && "shadow-lg ring-1 ring-border bg-surface-hover"
          )}
        >
          <div className="flex items-start gap-3">
            {hasMedia ? (
              <button
                type="button"
                onClick={() => setZoomed(true)}
                aria-label={`View ${exercise.name} ${videoMedia ? "video" : "animation"}`}
                className="shrink-0 rounded outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
              >
                <ExerciseMedia
                  imageUrl={exercise.imageUrl}
                  poster={posterForThumb}
                  alt={exercise.name}
                  size={64}
                />
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
                <span className="flex items-center gap-1 text-[11px] text-foreground-muted tabular-nums whitespace-nowrap">
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
            <DragHandle
              attributes={attributes}
              listeners={listeners}
              name={exercise.name}
            />
          </div>

          <div className="space-y-1.5">
            <div
              className={cn(
                "grid gap-2 px-2 text-[10px] uppercase tracking-wide text-neutral-500",
                isTime
                  ? "grid-cols-[1fr_56px]"
                  : "grid-cols-[1fr_1fr_56px]"
              )}
            >
              {isTime ? (
                <span className="text-center">Time</span>
              ) : (
                <>
                  <span className="text-center">{unitLabel(units)}</span>
                  <span className="text-center">Reps</span>
                </>
              )}
              <span />
            </div>
            {exercise.sets.map((set) =>
              isTime ? (
                <TimeSetInputRow
                  key={set.setNumber}
                  set={set}
                  setKey={`${sessionId}:${exercise.id}:${set.setNumber}`}
                  plannedSeconds={exercise.plannedSeconds}
                  lastSeconds={exercise.lastSeconds}
                  soundLead={soundLead}
                  vibrationLead={vibrationLead}
                  onChange={(patch, persist) => onChange(set.setNumber, patch, persist)}
                  onDelete={() => onDeleteSet(set.setNumber)}
                />
              ) : (
                <SetInputRow
                  key={set.setNumber}
                  set={set}
                  units={units}
                  lastWeight={exercise.lastWeight}
                  lastReps={exercise.lastReps}
                  onChange={(patch, persist) => onChange(set.setNumber, patch, persist)}
                  onDelete={() => onDeleteSet(set.setNumber)}
                />
              )
            )}
            <button
              type="button"
              onClick={onAddSet}
              className="flex items-center justify-center gap-1.5 w-full h-9 rounded-xl border border-dashed border-border-strong text-xs text-foreground-muted hover:text-foreground transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add set
            </button>
          </div>
        </div>
      </SwipeRow>
    </li>
    {zoomed && hasMedia ? (
      <div
        onClick={() => setZoomed(false)}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
      >
        <div
          ref={zoomDialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={`${exercise.name} ${videoMedia ? "video" : "animation"}`}
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
          className="relative bg-surface border border-border rounded-2xl p-4 max-w-sm w-full flex flex-col items-center gap-3 outline-none"
        >
          <button
            type="button"
            onClick={() => setZoomed(false)}
            aria-label="Close"
            className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full bg-black/70 text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
          {videoMedia ? (
            <VideoExercisePlayer
              media={videoMedia}
              alt={exercise.name}
              showSpeed
              onNeedsRefresh={
                exercise.videoPath
                  ? () => signCustomVideoUrl({ path: exercise.videoPath as string })
                  : undefined
              }
            />
          ) : (
            <ExerciseAnimation url={exercise.imageUrl} alt={exercise.name} size={288} />
          )}
          <p className="text-sm text-foreground-muted text-center">{exercise.name}</p>
        </div>
      </div>
    ) : null}
    </>
  );
}

type SortableListeners = ReturnType<typeof useSortable>["listeners"];
type SortableAttributes = ReturnType<typeof useSortable>["attributes"];

function DragHandle({
  attributes,
  listeners,
  name,
}: {
  attributes: SortableAttributes;
  listeners: SortableListeners;
  name: string;
}) {
  return (
    <button
      type="button"
      {...attributes}
      {...listeners}
      onPointerDown={(e) => {
        e.stopPropagation();
        listeners?.onPointerDown?.(e);
      }}
      aria-label={`Drag to reorder ${name}`}
      className="h-11 w-8 shrink-0 flex items-center justify-center text-foreground-muted hover:text-foreground touch-none cursor-grab active:cursor-grabbing outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] rounded"
    >
      <GripVertical className="w-4 h-4" />
    </button>
  );
}
