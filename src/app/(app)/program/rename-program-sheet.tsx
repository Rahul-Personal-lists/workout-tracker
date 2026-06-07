"use client";

import { useDialog } from "@/lib/use-dialog";

// Bottom-sheet rename prompt for a program. Controlled input — the parent owns
// the value/target/error (mirroring how ProgramSwitcher owns the delete
// confirm state), so reopening always reflects the current program name.
// a11y (focus into the input, focus trap, Escape, focus restore) comes from
// useDialog; z-[60] matches ConfirmSheet so it stacks the same way.
export function RenameProgramSheet({
  open,
  value,
  onChange,
  onSave,
  onCancel,
  pending = false,
  error,
}: {
  open: boolean;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  pending?: boolean;
  error?: string | null;
}) {
  const ref = useDialog<HTMLDivElement>(open, onCancel);
  if (!open) return null;

  const canSave = value.trim().length > 0 && !pending;

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
        aria-label="Rename program"
        tabIndex={-1}
        className="w-full max-w-md bg-surface border-t border-border rounded-t-xl px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] space-y-4 outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-foreground">Rename program</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canSave) onSave();
          }}
          className="space-y-4"
        >
          <label className="block space-y-1">
            <span className="block text-[11px] uppercase tracking-wide text-foreground-muted">
              Program name
            </span>
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              maxLength={80}
              placeholder="e.g. Hypertrophy block"
              className="w-full h-11 rounded-md bg-surface border border-border px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
            />
          </label>
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
              type="submit"
              disabled={!canSave}
              className="h-12 rounded-md text-sm font-medium bg-accent text-accent-foreground hover:opacity-90 outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
