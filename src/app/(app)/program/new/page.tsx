import Link from "next/link";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { PresetList } from "../preset-list";

export const dynamic = "force-dynamic";

export default function NewProgramPage() {
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
        <PresetList />
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
