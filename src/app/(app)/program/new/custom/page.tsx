import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { BlankProgramForm } from "../blank-program-form";

export const dynamic = "force-dynamic";

export default function CustomProgramPage() {
  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <Link
          href="/program/new"
          className="inline-flex items-center gap-1 text-xs text-foreground-muted"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> New Program
        </Link>
        <h1 className="text-2xl font-semibold">Build Your Own</h1>
        <p className="text-xs text-foreground-muted">
          Set the length, deloads, and training days. Add exercises after.
        </p>
      </header>

      <BlankProgramForm />
    </div>
  );
}
