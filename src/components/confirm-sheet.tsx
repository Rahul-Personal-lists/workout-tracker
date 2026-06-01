"use client";

import type { ReactNode } from "react";
import { useDialog } from "@/lib/use-dialog";

// Bottom-sheet confirmation. Replaces window.confirm() so destructive actions
// don't surface the browser's native "<host> says" dialog. a11y (focus trap,
// Escape, focus restore, nested-stack) comes from useDialog. z-[60] sits above
// the z-50 photo lightboxes so it can stack on top of them.
export function ConfirmSheet({
  open,
  title,
  description,
  confirmLabel = "Delete",
  busyLabel = "Deleting…",
  pending = false,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  busyLabel?: string;
  pending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useDialog<HTMLDivElement>(open, onCancel);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70"
      onClick={() => {
        if (!pending) onCancel();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="w-full max-w-md bg-surface border-t border-border rounded-t-xl px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] space-y-4 outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1.5">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description ? (
            <p className="text-sm text-foreground-muted">{description}</p>
          ) : null}
        </div>
        {error ? (
          <p
            role="alert"
            className="rounded-md border border-red-500/40 bg-red-500/10 text-red-300 text-xs px-3 py-2"
          >
            {error}
          </p>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="h-12 rounded-md text-sm font-medium border border-border text-foreground hover:bg-surface-hover outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="h-12 rounded-md text-sm font-medium bg-red-500 text-white hover:bg-red-600 outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] disabled:opacity-50"
          >
            {pending ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
