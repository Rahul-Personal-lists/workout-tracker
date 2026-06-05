"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { archiveProgram, seedPresetProgram } from "@/app/actions/program";
import { toast } from "@/components/toast";
import { useDialog } from "@/lib/use-dialog";
import { cn } from "@/lib/utils";
import type { ProgramSummary } from "@/lib/queries";

// Keep in sync with MAX_PROGRAMS in actions/program.ts — the server action is
// the source of truth; this only decides whether to seed straight away or open
// the archive-one sheet first.
const MAX_PROGRAMS = 2;

const RING =
  "outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]";

export function StartProgramButton({
  presetId,
  presetName,
  programs,
}: {
  presetId: string;
  presetName: string;
  // The user's existing non-archived programs (for the 2-program cap flow).
  programs: ProgramSummary[];
}) {
  const [pending, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const atCap = programs.length >= MAX_PROGRAMS;

  function seed() {
    startTransition(async () => {
      try {
        await seedPresetProgram({ presetId });
        // Success redirects to /program server-side; control won't return here.
      } catch {
        // We only reach here below the cap (atCap routes to the sheet), so a
        // throw is an unexpected failure — surface it honestly rather than
        // opening the archive sheet over a program list we know isn't full.
        toast("Couldn't start this program. Try again.");
      }
    });
  }

  // At the cap: archive the chosen program, then seed — `seedPresetProgram` now
  // has a free slot and redirects to /program on success.
  function archiveThenSeed(programId: string) {
    setError(null);
    startTransition(async () => {
      try {
        await archiveProgram({ programId });
        await seedPresetProgram({ presetId });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Couldn't start this program. Try again.",
        );
      }
    });
  }

  function onStart() {
    if (atCap) {
      setError(null);
      setSheetOpen(true);
    } else {
      seed();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onStart}
        disabled={pending}
        className="btn-primary w-full h-14 text-base"
      >
        {pending ? "Starting…" : "Start This Program"}
      </button>
      {sheetOpen ? (
        <ArchiveSheet
          presetName={presetName}
          programs={programs}
          pending={pending}
          error={error}
          onArchive={archiveThenSeed}
          onClose={() => {
            if (!pending) {
              setSheetOpen(false);
              setError(null);
            }
          }}
        />
      ) : null}
    </>
  );
}

function ArchiveSheet({
  presetName,
  programs,
  pending,
  error,
  onArchive,
  onClose,
}: {
  presetName: string;
  programs: ProgramSummary[];
  pending: boolean;
  error: string | null;
  onArchive: (programId: string) => void;
  onClose: () => void;
}) {
  const ref = useDialog<HTMLDivElement>(true, onClose);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Make room for this program"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-surface border-t border-border rounded-t-xl px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] space-y-4 outline-none"
      >
        <div className="space-y-1.5">
          <h2 className="text-base font-semibold text-foreground">
            You already have {MAX_PROGRAMS} programs
          </h2>
          <p className="text-sm text-foreground-muted">
            Archive one to start “{presetName}”. Your logged workouts are kept —
            only the program is removed.
          </p>
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-md border border-red-500/40 bg-red-500/10 text-red-300 text-xs px-3 py-2"
          >
            {error}
          </p>
        ) : null}

        <ul className="space-y-2">
          {programs.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onArchive(p.id)}
                disabled={pending}
                className={cn(
                  "w-full flex items-center gap-2 rounded-md border border-border px-3.5 h-12 text-sm text-left hover:bg-surface-hover disabled:opacity-50",
                  RING,
                )}
              >
                <span className="flex-1 min-w-0 truncate text-foreground">
                  {p.name}
                </span>
                {p.is_active ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-accent shrink-0">
                    <Check className="w-3 h-3" /> Active
                  </span>
                ) : null}
                <span className="text-xs text-foreground-muted shrink-0">
                  Archive &amp; start
                </span>
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className={cn(
            "w-full h-12 rounded-md text-sm font-medium border border-border text-foreground hover:bg-surface-hover disabled:opacity-50",
            RING,
          )}
        >
          {pending ? "Working…" : "Cancel"}
        </button>
      </div>
    </div>
  );
}
