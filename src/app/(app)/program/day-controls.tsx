"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Check, MoreVertical, Pencil, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { archiveDay, renameDay } from "@/app/actions/program";

type DayControlsProps = {
  dayId: string;
  initialLabel: string;
  initialTitle: string;
  selectedWeek: number;
};

export function DayControls({
  dayId,
  initialLabel,
  initialTitle,
  selectedWeek,
}: DayControlsProps) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [label, setLabel] = useState(initialLabel);
  const [title, setTitle] = useState(initialTitle);
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

  function save() {
    const l = label.trim();
    const t = title.trim();
    if (!l || !t) return;
    startTransition(async () => {
      try {
        await renameDay({ dayId, label: l, title: t });
        setEditing(false);
      } catch (err) {
        console.error("rename failed", err);
      }
    });
  }

  function cancelEdit() {
    setLabel(initialLabel);
    setTitle(initialTitle);
    setEditing(false);
  }

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

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          aria-label="Day label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="h-8 w-20 rounded bg-neutral-950 border border-neutral-700 px-2 text-xs"
        />
        <input
          aria-label="Day title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-8 w-32 rounded bg-neutral-950 border border-neutral-700 px-2 text-xs"
        />
        <button
          type="button"
          onClick={save}
          disabled={pending}
          aria-label="Save"
          className="h-11 w-11 rounded flex items-center justify-center text-emerald-400 disabled:opacity-50"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={cancelEdit}
          aria-label="Cancel"
          className="h-11 w-11 rounded flex items-center justify-center text-neutral-500"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={onTriggerClick}
        disabled={pending}
        aria-label={confirming ? "Confirm archive day" : "Day actions"}
        aria-expanded={menuOpen && !confirming}
        className={cn(
          "h-11 w-11 rounded flex items-center justify-center transition-colors",
          confirming
            ? "bg-red-500/15 text-red-400 border border-red-500/40"
            : "text-neutral-500 hover:text-neutral-300",
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
              setEditing(true);
            }}
            className="w-full text-left px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800 inline-flex items-center gap-2"
          >
            <Pencil className="w-3.5 h-3.5 text-neutral-500" /> Rename day
          </button>
          <Link
            href={`/program/add?day=${dayId}&week=${selectedWeek}`}
            role="menuitem"
            onClick={() => setMenuOpen(false)}
            className="w-full text-left px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800 inline-flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5 text-neutral-500" /> Add exercise
          </Link>
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
  );
}
