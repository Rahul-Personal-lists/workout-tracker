"use client";

import type { ReactNode } from "react";
import { BottomSheet } from "./bottom-sheet";

// Bottom-sheet confirmation. Replaces window.confirm() so destructive actions
// don't surface the browser's native "<host> says" dialog.
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
  return (
    <BottomSheet
      open={open}
      ariaLabel={title}
      onClose={onCancel}
      closeOnBackdrop={!pending}
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
    </BottomSheet>
  );
}
