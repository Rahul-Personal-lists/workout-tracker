import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ExerciseLibrary } from "./exercise-library";

export default function ExerciseLibraryPage() {
  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <Link
          href="/program"
          aria-label="Back to program"
          className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center border border-border bg-surface text-foreground-muted hover:text-foreground outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">Exercises</h1>
          <p className="text-xs text-foreground-muted">
            Browse the library and see how each move is done.
          </p>
        </div>
      </header>
      <ExerciseLibrary />
    </div>
  );
}
