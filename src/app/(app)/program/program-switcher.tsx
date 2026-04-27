"use client";

import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { setActiveProgram } from "@/app/actions/program";
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

  return (
    <div className="flex gap-1.5">
      {programs.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => (p.is_active ? null : activate(p.id))}
          disabled={pending || p.is_active}
          className={cn(
            "h-9 px-3 rounded-md text-xs border flex items-center gap-1.5 truncate max-w-[60vw]",
            p.is_active
              ? "bg-white text-black border-white"
              : "border-neutral-800 text-neutral-300"
          )}
        >
          {p.is_active ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> : null}
          <span className="truncate">{p.name}</span>
        </button>
      ))}
    </div>
  );
}
