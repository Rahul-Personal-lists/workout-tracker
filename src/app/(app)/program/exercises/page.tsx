import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { getCustomExercises, getFavoriteSlugs } from "@/lib/queries";
import { isMuscleRegion } from "@/lib/muscle-regions";
import { customToCatalogEntry } from "@/lib/exercise-catalog";
import { ExerciseLibrary } from "./exercise-library";

// Favorites + custom exercises are read per-request (RLS-scoped), so this route
// can't be static.
export const dynamic = "force-dynamic";

export default async function ExerciseLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string }>;
}) {
  const [{ region }, favorites, customs] = await Promise.all([
    searchParams,
    getFavoriteSlugs(),
    getCustomExercises(),
  ]);
  const initialRegion = isMuscleRegion(region) ? region : undefined;
  const customEntries = customs.map(customToCatalogEntry);
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
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold">Exercises</h1>
          <p className="text-xs text-foreground-muted">
            Browse the library and see how each move is done.
          </p>
        </div>
        <Link
          href="/program/exercises/new"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-surface px-3 h-9 text-xs text-foreground-muted hover:text-foreground outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
        >
          <Plus className="w-3.5 h-3.5" /> New
        </Link>
      </header>

      <ExerciseLibrary
        initialFavorites={[...favorites]}
        initialRegion={initialRegion}
        initialCustom={customEntries}
      />
    </div>
  );
}
