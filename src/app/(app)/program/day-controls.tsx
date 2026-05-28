"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { MoreVertical, Pencil, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { archiveDay } from "@/app/actions/program";

type DayControlsProps = {
  dayId: string;
  initialTitle: string;
  selectedWeek: number;
  totalWeeks: number;
  deloadWeeks: number[];
  programName: string;
  isToday: boolean;
};

export function DayControls({
  dayId,
  initialTitle,
  selectedWeek,
  totalWeeks,
  deloadWeeks,
  programName,
  isToday,
}: DayControlsProps) {
  const [confirming, setConfirming] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
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
        await archiveDay({ dayId });
      } catch (err) {
        console.error("archive day failed", err);
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

  const isDeload = deloadWeeks.includes(selectedWeek);
  const weekLine = isDeload
    ? `Week ${selectedWeek}/${totalWeeks} · Deload`
    : `Week ${selectedWeek}/${totalWeeks} · ${programName}`;
  const stageLabel = isToday ? "TODAY'S WORKOUT" : "UPCOMING WORKOUT";

  return (
    <div className="text-center space-y-1">
      <p className="text-xs font-medium text-accent tabular-nums">
        {weekLine}
      </p>
      <p className="text-lg font-bold italic uppercase tracking-wide">
        {stageLabel}
      </p>
      <div className="flex items-center justify-center gap-1.5">
        <h2 className="text-xs font-medium tracking-wide uppercase truncate text-foreground-muted">
          {initialTitle}
        </h2>
        <Link
          href={`/program/edit?day=${dayId}&week=${selectedWeek}`}
          aria-label="Edit workout"
          className="h-9 w-9 rounded-md inline-flex items-center justify-center text-foreground-muted hover:bg-surface-hover outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
        >
          <Pencil className="w-4 h-4" />
        </Link>
        <div ref={wrapperRef} className="relative">
          <button
            type="button"
            onClick={onTriggerClick}
            disabled={pending}
            aria-label={confirming ? "Confirm archive day" : "Day actions"}
            aria-expanded={menuOpen && !confirming}
            className={cn(
              "h-9 w-9 rounded-md flex items-center justify-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]",
              confirming
                ? "bg-red-500/15 text-red-400 border border-red-500/40"
                : "text-foreground-muted hover:bg-surface-hover",
              pending && "opacity-50"
            )}
          >
            {confirming ? (
              <X className="w-4 h-4" />
            ) : (
              <MoreVertical className="w-4 h-4" />
            )}
          </button>
          {menuOpen && !confirming ? (
            <div
              role="menu"
              className="absolute right-0 top-12 z-20 min-w-44 rounded-md border border-neutral-700 bg-neutral-900 shadow-lg py-1"
            >
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
                <Trash2 className="w-3.5 h-3.5" /> Archive day
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
