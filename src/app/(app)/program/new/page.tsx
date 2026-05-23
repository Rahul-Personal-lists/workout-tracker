import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { BlankProgramForm } from "./blank-program-form";
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
        <h1 className="text-2xl font-semibold">New program</h1>
        <p className="text-xs text-neutral-500">
          Pick a template or build your own.
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-[11px] uppercase tracking-wide text-neutral-500">
          Start from a template
        </h2>
        <PresetList />
      </section>

      <section className="space-y-2">
        <h2 className="text-[11px] uppercase tracking-wide text-neutral-500">
          Or build your own
        </h2>
        <BlankProgramForm />
      </section>
    </div>
  );
}
