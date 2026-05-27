"use client";

import { useState } from "react";
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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { ExerciseAnimation } from "@/components/exercise-animation";
import { SwipeRow } from "@/components/swipe-row";
import {
  archiveExerciseFromProgram,
  setExerciseOrder,
} from "@/app/actions/program";
import { formatWeight } from "@/lib/format";

export type SortableExerciseRow = {
  id: string;
  name: string;
  note: string | null;
  imageUrl: string | null;
  sets: number;
  plannedWeight: number | null;
  plannedReps: number | null;
};

export function SortableExerciseList({
  dayId,
  exercises,
}: {
  dayId: string;
  exercises: SortableExerciseRow[];
}) {
  const [items, setItems] = useState(exercises);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((x) => x.id === active.id);
    const newIdx = items.findIndex((x) => x.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const snapshot = items;
    const next = arrayMove(items, oldIdx, newIdx);
    setItems(next);
    setExerciseOrder({ dayId, orderedIds: next.map((x) => x.id) }).catch(
      (err) => {
        console.error("setExerciseOrder failed", err);
        setItems(snapshot);
      }
    );
  }

  function onDelete(id: string) {
    const snapshot = items;
    setItems((prev) => prev.filter((x) => x.id !== id));
    archiveExerciseFromProgram({ exerciseId: id }).catch((err) => {
      console.error("archiveExerciseFromProgram failed", err);
      setItems(snapshot);
    });
  }

  if (items.length === 0) {
    return (
      <p className="text-xs text-neutral-500 italic px-1 py-2">
        No exercises yet.
      </p>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={items.map((x) => x.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="space-y-1.5">
          {items.map((ex) => (
            <SortableRow key={ex.id} ex={ex} onDelete={() => onDelete(ex.id)} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  ex,
  onDelete,
}: {
  ex: SortableExerciseRow;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ex.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <li ref={setNodeRef} style={style} className="list-none">
      <SwipeRow
        onAction={onDelete}
        actionLabel="Delete"
        actionIcon={<Trash2 className="w-3.5 h-3.5" />}
        className="rounded-md"
      >
        <div
          className={
            isDragging
              ? "flex items-center gap-2 text-sm rounded-md bg-surface-hover shadow-lg ring-1 ring-border"
              : "flex items-center gap-2 text-sm"
          }
        >
          <ExerciseAnimation url={ex.imageUrl} alt={ex.name} size={44} />
          <span className="leading-snug flex-1 min-w-0">
            {ex.name}
            {ex.note ? (
              <span className="text-[11px] text-neutral-500 ml-1">
                ({ex.note})
              </span>
            ) : null}
          </span>
          <span className="text-xs text-foreground-muted tabular-nums whitespace-nowrap">
            {ex.sets}×{ex.plannedReps ?? "—"}
            {ex.plannedWeight !== null
              ? ` · ${formatWeight(ex.plannedWeight)} lb`
              : ""}
          </span>
          <button
            type="button"
            {...attributes}
            {...listeners}
            onPointerDown={(e) => {
              e.stopPropagation();
              listeners?.onPointerDown?.(e);
            }}
            aria-label={`Drag to reorder ${ex.name}`}
            className="h-11 w-8 shrink-0 flex items-center justify-center text-foreground-muted hover:text-foreground touch-none cursor-grab active:cursor-grabbing outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] rounded"
          >
            <GripVertical className="w-4 h-4" />
          </button>
        </div>
      </SwipeRow>
    </li>
  );
}
