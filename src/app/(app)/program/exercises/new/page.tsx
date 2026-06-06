import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CreateCustomExerciseClient } from "./create-custom-exercise-client";

export const dynamic = "force-dynamic";

export default async function NewCustomExercisePage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  const safeReturnTo = returnTo && /^\/[^/]/.test(returnTo) ? returnTo : null;

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <Link
          href={safeReturnTo ?? "/program/exercises"}
          aria-label="Back"
          className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center border border-border bg-surface text-foreground-muted hover:text-foreground outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">New custom exercise</h1>
          <p className="text-xs text-foreground-muted">
            Upload a clip, reframe &amp; trim it, tag the muscles.
          </p>
        </div>
      </header>

      <CreateCustomExerciseClient returnTo={safeReturnTo} />
    </div>
  );
}
