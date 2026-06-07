"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useDialog } from "@/lib/use-dialog";

// Shared bottom-sheet modal shell: full-screen backdrop + slide-up panel with
// dialog a11y (focus trap, Escape, focus restore, nested stack) from useDialog.
// z-[60] sits above the z-50 photo lightboxes so a sheet can stack on top of one.
export function BottomSheet({
  open,
  ariaLabel,
  onClose,
  closeOnBackdrop = true,
  className,
  children,
}: {
  open: boolean;
  ariaLabel: string;
  onClose: () => void;
  /** Tapping the backdrop closes the sheet. Pass `!pending` to lock it mid-action. */
  closeOnBackdrop?: boolean;
  /** Overrides the default vertical rhythm of the panel (default `space-y-4`). */
  className?: string;
  children: ReactNode;
}) {
  const ref = useDialog<HTMLDivElement>(open, onClose);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70"
      onClick={() => {
        if (closeOnBackdrop) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "w-full max-w-md bg-surface border-t border-border rounded-t-xl px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] outline-none",
          className ?? "space-y-4",
        )}
      >
        {children}
      </div>
    </div>
  );
}
