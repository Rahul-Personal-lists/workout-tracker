"use client";

import { useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { Check } from "lucide-react";
import { archiveProgram, seedPresetProgram } from "@/app/actions/program";
import { toast } from "@/components/toast";
import { BottomSheet } from "@/components/bottom-sheet";
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
      } catch (err) {
        // seedPresetProgram redirects via NEXT_REDIRECT on success — re-throw that
        // (and any framework signal) so navigation happens instead of being shown
        // as a failure. We only reach a real throw below the cap (atCap routes to
        // the sheet), so surface it honestly.
        unstable_rethrow(err);
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
        // seedPresetProgram redirects via NEXT_REDIRECT on success — let it
        // propagate so the navigation happens instead of surfacing as an error.
        unstable_rethrow(err);
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
  return (
    <BottomSheet open ariaLabel="Make room for this program" onClose={onClose}>
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
    </BottomSheet>
  );
}
