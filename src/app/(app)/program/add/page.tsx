import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentProgram } from "@/lib/queries";
import { AddExerciseClient } from "./add-exercise-client";

export const dynamic = "force-dynamic";

export default async function AddExercisePage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string; week?: string; returnTo?: string }>;
}) {
  const { day: dayId, week, returnTo } = await searchParams;
  if (!dayId) notFound();

  const program = await getCurrentProgram();
  const day = program?.days.find((d) => d.id === dayId);
  if (!program || !day) notFound();

  const weekNum = week ? parseInt(week, 10) : 1;
  // Only honor same-origin paths to prevent open-redirect via crafted query.
  const safeReturnTo =
    returnTo && /^\/[^/]/.test(returnTo) ? returnTo : null;
  const backHref = safeReturnTo ?? `/program?week=${weekNum}`;
  const backLabel = safeReturnTo?.startsWith("/workout/") ? "Workout" : "Program";

  return (
    <div className="space-y-5">
      <Link
        href={backHref}
        className="inline-flex items-center text-sm text-neutral-400"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> {backLabel}
      </Link>

      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-neutral-500">
          {day.label} — adding exercise
        </p>
        <h1 className="text-xl font-semibold leading-tight">{day.title}</h1>
      </header>

      <AddExerciseClient
        programDayId={day.id}
        redirectWeek={weekNum}
        returnTo={safeReturnTo}
      />
    </div>
  );
}
