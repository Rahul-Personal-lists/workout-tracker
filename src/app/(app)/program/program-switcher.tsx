"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Check, ChevronDown, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { archiveProgram, setActiveProgram } from "@/app/actions/program";
import type { ProgramSummary } from "@/lib/queries";

export function ProgramSwitcher({
  programs,
  canAddProgram,
}: {
  programs: ProgramSummary[];
  canAddProgram: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const active = programs.find((p) => p.is_active) ?? programs[0];
  const canDelete = programs.length > 1;

  function activate(programId: string) {
    setOpen(false);
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
    setOpen(false);
    startTransition(async () => {
      try {
        await archiveProgram({ programId: p.id });
      } catch (err) {
        alert(err instanceof Error ? err.message : "Could not delete.");
      }
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        aria-haspopup="menu"
        aria-expanded={open}
        data-tour="open-new-program"
        className="h-9 px-3 text-xs rounded-md border border-border bg-surface text-foreground flex items-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] disabled:opacity-50"
      >
        <span className="truncate max-w-[10rem]">{active?.name ?? "My Plan"}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "w-3.5 h-3.5 text-foreground-muted shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-full mt-1.5 z-20 min-w-[14rem] max-w-[80vw] rounded-xl border border-border bg-surface p-1 shadow-lg"
        >
          {programs.map((p) => (
            <div key={p.id} className="flex items-center gap-1">
              <button
                type="button"
                role="menuitem"
                onClick={() => (p.is_active ? setOpen(false) : activate(p.id))}
                disabled={pending}
                className="flex-1 min-w-0 h-9 px-2.5 rounded-lg text-xs text-left flex items-center gap-2 hover:bg-surface-hover outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
              >
                <span className="w-4 shrink-0 inline-flex justify-center">
                  {p.is_active ? (
                    <Check className="w-3.5 h-3.5 text-accent" />
                  ) : null}
                </span>
                <span className="truncate">{p.name}</span>
              </button>
              {canDelete ? (
                <button
                  type="button"
                  onClick={() => remove(p)}
                  disabled={pending}
                  aria-label={`Delete ${p.name}`}
                  className="h-9 w-9 shrink-0 rounded-lg inline-flex items-center justify-center text-foreground-muted hover:bg-surface-hover hover:text-foreground disabled:opacity-40 outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>
          ))}
          {canAddProgram ? (
            <div className="mt-1 border-t border-border pt-1">
              <Link
                href="/program/new"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="h-9 px-2.5 rounded-lg text-xs flex items-center gap-2 text-foreground-muted hover:bg-surface-hover hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
              >
                <span className="w-4 shrink-0 inline-flex justify-center">
                  <Plus className="w-3.5 h-3.5" />
                </span>
                <span className="truncate">New Program</span>
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
