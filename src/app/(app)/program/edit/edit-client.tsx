"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
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
import { GripVertical, Heart, Link as LinkIcon, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExerciseAnimation } from "@/components/exercise-animation";
import { formatWeight } from "@/lib/format";
import type { Units } from "@/lib/units";
import { saveDayEdits } from "@/app/actions/program";

type Row = {
  id: string;
  name: string;
  note: string | null;
  imageUrl: string | null;
  sets: number;
  plannedWeight: number | null;
  plannedReps: number | null;
};

export function EditDayClient({
  dayId,
  dayTitle,
  selectedWeek,
  isToday,
  exercises,
  units,
}: {
  dayId: string;
  dayTitle: string;
  selectedWeek: number;
  isToday: boolean;
  exercises: Row[];
  units: Units;
}) {
  const router = useRouter();
  const [items, setItems] = useState(exercises);
  const [pending, startTransition] = useTransition();

  const isDirty = useMemo(() => {
    if (items.length !== exercises.length) return true;
    return items.some((item, i) => item.id !== exercises[i].id);
  }, [items, exercises]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((x) => x.id === active.id);
    const newIdx = items.findIndex((x) => x.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    setItems(arrayMove(items, oldIdx, newIdx));
  }

  function onDelete(id: string) {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  function onSave() {
    startTransition(async () => {
      try {
        await saveDayEdits({ dayId, orderedIds: items.map((x) => x.id) });
        router.push(`/program?day=${dayId}&week=${selectedWeek}`);
        router.refresh();
      } catch (err) {
        console.error("saveDayEdits failed", err);
        alert(err instanceof Error ? err.message : "Could not save.");
      }
    });
  }

  function notImplemented(label: string) {
    alert(`${label} — coming soon.`);
  }

  const stageLabel = isToday ? "Today's Workout" : "Upcoming Workout";

  return (
    <div className="-mx-4 -mt-6 min-h-dvh bg-background flex flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 h-12 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <button
          type="button"
          onClick={() => router.push(`/program?day=${dayId}&week=${selectedWeek}`)}
          disabled={!isDirty || pending}
          className={cn(
            "text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] rounded px-1",
            !isDirty || pending
              ? "text-foreground-muted opacity-50"
              : "text-foreground-muted hover:text-foreground",
          )}
        >
          Discard
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={pending || !isDirty}
          className={cn(
            "text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] rounded px-1",
            pending || !isDirty ? "text-foreground-muted opacity-50" : "text-accent",
          )}
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </header>

      <div className="px-4 pt-5 pb-2 space-y-0.5">
        <h1 className="text-2xl font-bold tracking-tight">{stageLabel}</h1>
        <p className="text-sm text-foreground-muted">{dayTitle}</p>
      </div>

      <div className="flex-1 px-4 pt-3 pb-36">
        {items.length === 0 ? (
          <p className="text-sm text-foreground-muted italic px-1 py-6 text-center">
            No exercises. Tap Add Exercises below to add one, or Discard to cancel.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={items.map((x) => x.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-2">
                {items.map((ex) => (
                  <SortableEditRow
                    key={ex.id}
                    ex={ex}
                    units={units}
                    onDelete={() => onDelete(ex.id)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <nav
        aria-label="Edit actions"
        className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="max-w-md mx-auto grid grid-cols-3 h-20">
          <Link
            href={`/program/add?day=${dayId}&week=${selectedWeek}`}
            className="flex flex-col items-center justify-center gap-1 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
          >
            <Plus className="w-6 h-6 text-accent" strokeWidth={2.25} />
            <span>Add Exercises</span>
          </Link>
          <button
            type="button"
            onClick={() => notImplemented("Add Superset")}
            className="flex flex-col items-center justify-center gap-1 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
          >
            <LinkIcon className="w-6 h-6 text-accent" strokeWidth={2.25} />
            <span>Add Superset</span>
          </button>
          <button
            type="button"
            onClick={() => notImplemented("Add Cardio")}
            className="flex flex-col items-center justify-center gap-1 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
          >
            <Heart className="w-6 h-6 text-accent" strokeWidth={2.25} />
            <span>Add Cardio</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

function SortableEditRow({
  ex,
  onDelete,
  units,
}: {
  ex: Row;
  onDelete: () => void;
  units: Units;
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
      <div
        className={cn(
          "flex items-center gap-3 p-2.5 rounded-xl bg-surface border border-border",
          isDragging && "shadow-lg ring-1 ring-border",
        )}
      >
        <div className="relative shrink-0">
          <div className="rounded-lg overflow-hidden bg-white">
            <ExerciseAnimation
              url={ex.imageUrl}
              alt={ex.name}
              size={56}
              shape="square"
            />
          </div>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${ex.name}`}
            className="absolute -bottom-1 -left-1 h-6 w-6 rounded-md flex items-center justify-center bg-red-500 text-white shadow-md outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium leading-snug truncate">
            {ex.name}
            {ex.note ? (
              <span className="text-[11px] text-foreground-muted ml-1">
                ({ex.note})
              </span>
            ) : null}
          </p>
          <p className="text-xs text-foreground-muted tabular-nums">
            {ex.sets}×{ex.plannedReps ?? "—"}
            {ex.plannedWeight !== null
              ? ` · ${formatWeight(ex.plannedWeight, units)}`
              : ""}
          </p>
        </div>
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
    </li>
  );
}
