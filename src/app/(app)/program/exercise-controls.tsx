"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown, ChevronUp, MoreVertical, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { archiveExerciseFromProgram, reorderExercise } from "@/app/actions/program";

type Props = {
  exerciseId: string;
  isFirst: boolean;
  isLast: boolean;
  showRemove?: boolean;
  // If provided, replaces the default reorderExercise server call. The
  // workout view uses this to swap local state optimistically before the
  // server roundtrip, since the workout page doesn't auto-revalidate.
  onReorder?: (direction: "up" | "down") => void;
};

export function ExerciseControls({
  exerciseId,
  isFirst,
  isLast,
  showRemove = true,
  onReorder,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  function commitArchive() {
    startTransition(async () => {
      try {
        await archiveExerciseFromProgram({ exerciseId });
      } catch (err) {
        console.error("archive exercise failed", err);
        setConfirming(false);
      }
    });
  }

  function onTriggerClick() {
    if (confirming) {
      commitArchive();
      return;
    }
    setMenuOpen((o) => !o);
  }

  const hasActions = !isFirst || !isLast || showRemove;
  if (!hasActions) return null;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={onTriggerClick}
        disabled={pending}
        aria-label={confirming ? "Confirm remove exercise" : "Exercise actions"}
        aria-expanded={menuOpen && !confirming}
        className={cn(
          "h-11 w-11 rounded flex items-center justify-center shrink-0 transition-colors",
          confirming
            ? "bg-red-500/15 text-red-400 border border-red-500/40"
            : "text-neutral-500 hover:text-neutral-300",
          pending && "opacity-50"
        )}
      >
        {confirming ? <X className="w-4 h-4" /> : <MoreVertical className="w-4 h-4" />}
      </button>
      {menuOpen && !confirming ? (
        <div
          role="menu"
          className="absolute right-0 top-12 z-20 min-w-40 rounded-md border border-neutral-700 bg-neutral-900 shadow-lg py-1"
        >
          {!isFirst && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                if (onReorder) onReorder("up");
                else startTransition(() => reorderExercise({ exerciseId, direction: "up" }));
              }}
              disabled={pending}
              className="w-full text-left px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800 inline-flex items-center gap-2"
            >
              <ChevronUp className="w-3.5 h-3.5 text-neutral-500" /> Move up
            </button>
          )}
          {!isLast && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                if (onReorder) onReorder("down");
                else startTransition(() => reorderExercise({ exerciseId, direction: "down" }));
              }}
              disabled={pending}
              className="w-full text-left px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800 inline-flex items-center gap-2"
            >
              <ChevronDown className="w-3.5 h-3.5 text-neutral-500" /> Move down
            </button>
          )}
          {showRemove && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                setConfirming(true);
                setTimeout(() => setConfirming(false), 2500);
              }}
              className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-neutral-800 inline-flex items-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" /> Remove exercise
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
