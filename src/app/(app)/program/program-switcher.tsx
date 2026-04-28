"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { archiveProgram, setActiveProgram } from "@/app/actions/program";
import type { ProgramSummary } from "@/lib/queries";

export function ProgramSwitcher({
  programs,
}: {
  programs: ProgramSummary[];
}) {
  const [pending, startTransition] = useTransition();

  function activate(programId: string) {
    startTransition(async () => {
      try {
        await setActiveProgram({ programId });
      } catch (err) {
        alert(err instanceof Error ? err.message : "Could not switch.");
      }
    });
  }

  function remove(p: ProgramSummary) {
    if (!confirm(`Delete "${p.name}"? Past sessions will be kept.`)) return;
    startTransition(async () => {
      try {
        await archiveProgram({ programId: p.id });
      } catch (err) {
        alert(err instanceof Error ? err.message : "Could not delete.");
      }
    });
  }

  const canDelete = programs.length > 1;

  return (
    <div className="flex flex-wrap gap-1.5">
      {programs.map((p) => (
        <div key={p.id} className="flex items-center">
          <button
            type="button"
            onClick={() => (p.is_active ? null : activate(p.id))}
            disabled={pending || p.is_active}
            className={cn(
              "h-9 px-3 text-xs border flex items-center gap-1.5 truncate max-w-[50vw]",
              canDelete ? "rounded-l-md border-r-0" : "rounded-md",
              p.is_active
                ? "bg-accent text-accent-foreground border-accent"
                : "border-neutral-800 text-neutral-300"
            )}
          >
            {p.is_active ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> : null}
            <span className="truncate">{p.name}</span>
          </button>
          {canDelete ? (
            <button
              type="button"
              onClick={() => remove(p)}
              disabled={pending}
              aria-label={`Delete ${p.name}`}
              className={cn(
                "h-9 w-9 rounded-r-md border flex items-center justify-center disabled:opacity-40",
                p.is_active
                  ? "border-accent text-accent-foreground bg-accent"
                  : "border-neutral-800 text-neutral-400"
              )}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
