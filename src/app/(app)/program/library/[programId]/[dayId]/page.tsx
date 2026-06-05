import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getLibraryProgram } from "@/lib/program-library";

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ programId: string; dayId: string }>;
}) {
  const { programId, dayId } = await params;
  const program = getLibraryProgram(programId);
  const day = program?.days.find(
    (d) => String(d.day_number) === dayId && d.exercises.length > 0,
  );
  if (!program || !day) notFound();

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <Link
          href={`/program/library/${programId}`}
          aria-label="Back to program"
          className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center border border-border bg-surface text-foreground-muted hover:text-foreground outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold truncate">{day.title}</h1>
          <p className="text-xs text-foreground-muted truncate">{program.name}</p>
        </div>
      </header>

      <p className="rounded-2xl border border-dashed border-border-strong bg-surface-subtle p-4 text-sm text-foreground-muted">
        {day.exercises.length} exercises. Full plan detail — stat row, exercise
        thumbnails and target-muscle badges — is coming in the next step.
      </p>
    </div>
  );
}
