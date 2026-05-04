"use client";

import { useEffect, useRef, useState } from "react";
import { StickyNote, X } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";

type Props = {
  notes: string;
  startedAt: string;
  weekNumber: number;
};

export function DayNotePopover({ notes, startedAt, weekNumber }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const ago = formatDistanceToNowStrict(new Date(startedAt), { addSuffix: true });

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-label="Last session note"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="h-8 w-8 -mr-1.5 rounded-md flex items-center justify-center text-foreground-muted hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <StickyNote className="w-4 h-4" />
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="Last session note"
          className="absolute right-0 top-9 z-30 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-surface text-foreground shadow-xl"
        >
          <div className="flex items-start justify-between gap-2 border-b border-border px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-foreground-muted">
              Last session · Week {weekNumber} · {ago}
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="-mt-0.5 -mr-1 h-6 w-6 flex items-center justify-center text-foreground-muted hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="px-3 py-2.5 text-sm whitespace-pre-wrap">{notes}</p>
        </div>
      ) : null}
    </div>
  );
}
