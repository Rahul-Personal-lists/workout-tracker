"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { undoLastSkip } from "@/app/actions/workout";
import type { UndoableSkip } from "@/lib/queries";

export function SkipUndoBanner({ skip }: { skip: UndoableSkip }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [expired, setExpired] = useState(() => Date.now() >= skip.expiresAt);

  useEffect(() => {
    const ms = skip.expiresAt - Date.now();
    // `expired` is already lazy-initialized to (now >= expiresAt), so if the
    // window has passed there's nothing left to schedule.
    if (ms <= 0) return;
    const t = setTimeout(() => setExpired(true), ms);
    return () => clearTimeout(t);
  }, [skip.expiresAt]);

  if (expired) return null;

  function onUndo() {
    startTransition(async () => {
      await undoLastSkip();
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface-subtle px-4 py-3 text-sm">
      <span className="flex flex-col min-w-0">
        <span className="font-medium">Rest day logged</span>
        <span className="text-xs text-foreground-muted truncate">
          {skip.dayLabel}: {skip.dayTitle}
        </span>
      </span>
      <button
        type="button"
        onClick={onUndo}
        disabled={pending}
        className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-accent shrink-0 disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] rounded px-1"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        {pending ? "Undoing…" : "Undo"}
      </button>
    </div>
  );
}
