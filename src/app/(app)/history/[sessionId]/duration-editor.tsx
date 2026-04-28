"use client";

import { useState, useTransition } from "react";
import { Pencil, Check, X } from "lucide-react";
import { editSessionDuration } from "@/app/actions/workout";
import { formatDuration } from "@/lib/format";

export function DurationEditor({
  sessionId,
  durationSeconds,
}: {
  sessionId: string;
  durationSeconds: number | null;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  const initial = durationSeconds ?? 0;
  const [mins, setMins] = useState(String(Math.floor(initial / 60)));
  const [secs, setSecs] = useState(String(initial % 60));

  function save() {
    const m = parseInt(mins, 10);
    const s = parseInt(secs, 10);
    const mClean = Number.isFinite(m) ? Math.max(0, m) : 0;
    const sClean = Number.isFinite(s) ? Math.max(0, Math.min(59, s)) : 0;
    const total = mClean * 60 + sClean;
    startTransition(async () => {
      try {
        await editSessionDuration({ sessionId, durationSeconds: total });
        setEditing(false);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Could not save.");
      }
    });
  }

  function cancel() {
    setMins(String(Math.floor(initial / 60)));
    setSecs(String(initial % 60));
    setEditing(false);
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1 tabular-nums">
        <input
          aria-label="Minutes"
          value={mins}
          onChange={(e) => setMins(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
          inputMode="numeric"
          className="h-6 w-10 rounded bg-neutral-950 border border-neutral-700 px-1 text-[11px] text-center"
        />
        <span>:</span>
        <input
          aria-label="Seconds"
          value={secs}
          onChange={(e) => setSecs(e.target.value.replace(/[^\d]/g, "").slice(0, 2))}
          inputMode="numeric"
          className="h-6 w-10 rounded bg-neutral-950 border border-neutral-700 px-1 text-[11px] text-center"
        />
        <button
          type="button"
          onClick={save}
          disabled={pending}
          aria-label="Save"
          className="h-6 w-6 flex items-center justify-center text-emerald-400 disabled:opacity-50"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={cancel}
          aria-label="Cancel"
          className="h-6 w-6 flex items-center justify-center text-neutral-500"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      aria-label="Edit duration"
      className="inline-flex items-center gap-1 hover:text-neutral-200"
    >
      <span>{formatDuration(durationSeconds)}</span>
      <Pencil className="w-3 h-3 text-neutral-500" />
    </button>
  );
}
