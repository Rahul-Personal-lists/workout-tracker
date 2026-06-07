import Link from "next/link";
import { BookOpen, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { LIBRARY_PROGRAMS } from "@/lib/program-library";

const CARD =
  "group flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 transition-colors hover:bg-surface-hover outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]";

export default function NewProgramPage() {
  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <Link
          href="/program"
          className="inline-flex items-center gap-1 text-xs text-foreground-muted"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Program
        </Link>
        <h1 className="text-2xl font-semibold">New Program</h1>
        <p className="text-xs text-foreground-muted">
          Pick a ready-made plan or build your own.
        </p>
      </header>

      <div className="space-y-3">
        <Link href="/program/library" className={CARD}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <BookOpen className="w-5 h-5" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-medium text-foreground">
              Browse the library
            </span>
            <span className="block text-[11px] text-foreground-muted">
              {LIBRARY_PROGRAMS.length} programs · all goals, splits &amp; day
              counts
            </span>
          </span>
          <ChevronRight className="w-4 h-4 shrink-0 text-foreground-muted transition-transform group-hover:translate-x-0.5" />
        </Link>

        <Link href="/program/new/custom" className={CARD}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <Pencil className="w-5 h-5" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-medium text-foreground">
              Start from scratch
            </span>
            <span className="block text-[11px] text-foreground-muted">
              Build your own program day by day
            </span>
          </span>
          <ChevronRight className="w-4 h-4 shrink-0 text-foreground-muted transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
