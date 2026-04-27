"use client";

import { useState, useTransition } from "react";
import { Pencil, Check, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { archiveDay, renameDay } from "@/app/actions/program";

type DayControlsProps = {
  dayId: string;
  initialLabel: string;
  initialTitle: string;
};

export function DayControls({
  dayId,
  initialLabel,
  initialTitle,
}: DayControlsProps) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [label, setLabel] = useState(initialLabel);
  const [title, setTitle] = useState(initialTitle);
  const [pending, startTransition] = useTransition();

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

  function onArchive() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 2500);
      return;
    }
    startTransition(async () => {
      try {
        await archiveDay({ dayId });
      } catch (err) {
        console.error("archive day failed", err);
        setConfirming(false);
      }
    });
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
          className="h-8 w-8 rounded flex items-center justify-center text-emerald-400 disabled:opacity-50"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={cancelEdit}
          aria-label="Cancel"
          className="h-8 w-8 rounded flex items-center justify-center text-neutral-500"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label="Rename day"
        className="h-8 w-8 rounded flex items-center justify-center text-neutral-500 hover:text-neutral-300"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={onArchive}
        disabled={pending}
        aria-label={confirming ? "Confirm remove day" : "Remove day"}
        className={cn(
          "h-8 w-8 rounded flex items-center justify-center transition-colors",
          confirming
            ? "bg-red-500/15 text-red-400 border border-red-500/40"
            : "text-neutral-500 hover:text-neutral-300",
          pending && "opacity-50"
        )}
      >
        {confirming ? <X className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
