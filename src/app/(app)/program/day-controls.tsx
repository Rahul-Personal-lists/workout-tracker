"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  ChevronUp,
  ChevronDown,
  MoreVertical,
  Pencil,
  Trash2,
  X,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getPhase } from "@/lib/progression";
import { archiveDay, renameDay, reorderDay } from "@/app/actions/program";

type DayControlsProps = {
  dayId: string;
  initialLabel: string;
  initialTitle: string;
  selectedWeek: number;
  totalWeeks: number;
  deloadWeeks: number[];
  isFirst: boolean;
  isLast: boolean;
};

export function DayControls({
  dayId,
  initialLabel,
  initialTitle,
  selectedWeek,
  totalWeeks,
  deloadWeeks,
  isFirst,
  isLast,
}: DayControlsProps) {
  const [confirming, setConfirming] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(initialLabel);
  const [title, setTitle] = useState(initialTitle);
  const [pending, startTransition] = useTransition();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLInputElement>(null);

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

  function openRename() {
    setMenuOpen(false);
    setEditing(true);
    requestAnimationFrame(() => labelRef.current?.select());
  }

  function cancelRename() {
    setLabel(initialLabel);
    setTitle(initialTitle);
    setEditing(false);
  }

  function saveRename() {
    const trimmedLabel = label.trim();
    const trimmedTitle = title.trim();
    if (
      !trimmedLabel ||
      !trimmedTitle ||
      (trimmedLabel === initialLabel && trimmedTitle === initialTitle)
    ) {
      cancelRename();
      return;
    }
    startTransition(async () => {
      try {
        await renameDay({
          dayId,
          label: trimmedLabel,
          title: trimmedTitle,
        });
      } catch {
        setLabel(initialLabel);
        setTitle(initialTitle);
      }
      setEditing(false);
    });
  }

  function onRenameKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      saveRename();
    }
    if (e.key === "Escape") {
      cancelRename();
    }
  }

  function onTriggerClick() {
    if (confirming) {
      commitArchive();
      return;
    }
    setMenuOpen((o) => !o);
  }

  const isDeload = deloadWeeks.includes(selectedWeek);
  const phase = isDeload ? "Deload" : getPhase(selectedWeek);

  if (editing) {
    return (
      <div className="space-y-2 text-center">
        <p className="text-xs font-medium text-accent tabular-nums">
          Week {selectedWeek}/{totalWeeks} · {phase}
        </p>
        <div className="space-y-1.5 max-w-xs mx-auto">
          <input
            ref={labelRef}
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={onRenameKeyDown}
            disabled={pending}
            maxLength={40}
            placeholder="Label (e.g. Day 1)"
            className={cn(
              "text-[11px] uppercase tracking-wide bg-transparent border-b border-accent outline-none w-full text-center text-neutral-200 placeholder:text-neutral-600",
              pending && "opacity-50"
            )}
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={onRenameKeyDown}
            disabled={pending}
            maxLength={80}
            placeholder="Title (e.g. Upper Body)"
            className={cn(
              "text-lg font-bold tracking-wide bg-transparent border-b border-accent outline-none w-full text-center placeholder:text-neutral-600",
              pending && "opacity-50"
            )}
          />
        </div>
        <div className="flex items-center justify-center gap-2 pt-1">
          <button
            type="button"
            onClick={saveRename}
            disabled={pending}
            aria-label="Save day name"
            className="h-10 w-10 rounded-md flex items-center justify-center text-accent hover:bg-surface-hover"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={cancelRename}
            disabled={pending}
            aria-label="Cancel rename"
            className="h-10 w-10 rounded-md flex items-center justify-center text-foreground-muted hover:bg-surface-hover"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center space-y-1">
      <p className="text-xs font-medium text-accent tabular-nums">
        Week {selectedWeek}/{totalWeeks} · {phase}
      </p>
      <div className="flex items-center justify-center gap-1.5">
        <h2 className="text-lg font-bold tracking-wide uppercase truncate">
          {initialTitle}
        </h2>
        <button
          type="button"
          onClick={openRename}
          aria-label="Rename day"
          className="h-9 w-9 rounded-md inline-flex items-center justify-center text-foreground-muted hover:bg-surface-hover outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
        >
          <Pencil className="w-4 h-4" />
        </button>
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
              {!isFirst && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    startTransition(() => reorderDay({ dayId, direction: "up" }));
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
                    startTransition(() => reorderDay({ dayId, direction: "down" }));
                  }}
                  disabled={pending}
                  className="w-full text-left px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800 inline-flex items-center gap-2"
                >
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-500" /> Move down
                </button>
              )}
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
