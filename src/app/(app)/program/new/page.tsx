import Link from "next/link";
import { BookOpen, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { getGoalWeight, getTodayWeightLb } from "@/lib/queries";
import { LIBRARY_PROGRAMS } from "@/lib/program-library";
import { PresetList } from "../preset-list";

export const dynamic = "force-dynamic";

export default async function NewProgramPage() {
  const [todayWeight, goalWeight] = await Promise.all([
    getTodayWeightLb(),
    getGoalWeight(),
  ]);
  const weightLb = todayWeight ?? goalWeight ?? 170;
  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <Link
          href="/program"
          className="inline-flex items-center gap-1 text-xs text-neutral-400"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Program
        </Link>
        <h1 className="text-2xl font-semibold">New Program</h1>
        <p className="text-xs text-neutral-500">
          Pick a template or build your own.
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-foreground">
          Start From a Template
        </h2>
        <PresetList weightLb={weightLb} />
        <Link
          href="/program/library"
          className="group flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 transition-colors hover:bg-surface-hover outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <BookOpen className="w-5 h-5" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-medium text-foreground">
              Browse the full library
            </span>
            <span className="block text-[11px] text-foreground-muted">
              {LIBRARY_PROGRAMS.length} programs · all goals, splits &amp; day counts
            </span>
          </span>
          <ChevronRight className="w-4 h-4 shrink-0 text-foreground-muted transition-transform group-hover:translate-x-0.5" />
        </Link>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-foreground">
          Or Build Your Own
        </h2>
        <Link
          href="/program/new/custom"
          className="btn-ghost-add h-14 px-4 justify-between text-sm"
        >
          <span className="inline-flex items-center gap-2">
            <Pencil className="w-4 h-4" />
            Start from scratch
          </span>
          <ChevronRight className="w-4 h-4 text-neutral-500" />
        </Link>
      </section>
    </div>
  );
}
