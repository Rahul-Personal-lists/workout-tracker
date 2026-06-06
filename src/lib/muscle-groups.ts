import catalogJson from "../../public/data/exercises-catalog.json";
import {
  regionsFromCatalogMuscles,
  type MuscleRegion,
} from "@/lib/muscle-regions";

export const TOP_LEVEL_GROUPS = [
  "chest",
  "back",
  "legs",
  "glutes",
  "shoulders",
  "arms",
  "abs",
  "calves",
] as const;

export type TopLevelGroup = (typeof TOP_LEVEL_GROUPS)[number];

const CATALOG_TO_TOP_LEVEL: Record<string, TopLevelGroup> = {
  chest: "chest",
  lats: "back",
  "lower back": "back",
  "middle back": "back",
  traps: "back",
  quadriceps: "legs",
  hamstrings: "legs",
  glutes: "glutes",
  adductors: "legs",
  abductors: "legs",
  shoulders: "shoulders",
  neck: "shoulders",
  biceps: "arms",
  triceps: "arms",
  forearms: "arms",
  abdominals: "abs",
  calves: "calves",
};

type CatalogEntry = {
  id: string;
  name: string;
  primary: string[];
};

const catalog = catalogJson as CatalogEntry[];

const bySlug = new Map<string, CatalogEntry>();
const byName = new Map<string, CatalogEntry>();
for (const e of catalog) {
  bySlug.set(e.id, e);
  byName.set(e.name.toLowerCase(), e);
}

function entryToGroups(entry: CatalogEntry): TopLevelGroup[] {
  const groups = new Set<TopLevelGroup>();
  for (const m of entry.primary) {
    const top = CATALOG_TO_TOP_LEVEL[m.toLowerCase()];
    if (top) groups.add(top);
  }
  return [...groups];
}

function slugFromImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  const m = imageUrl.match(/\/exercises\/([^/]+)\//);
  return m ? m[1] : null;
}

export function getMuscleGroupsForExercise(
  name: string,
  imageUrl: string | null | undefined,
  // Snapshot muscle strings (custom exercises have no catalog slug); when
  // present they win over the slug/name lookup.
  muscles?: string[] | null
): TopLevelGroup[] {
  if (muscles && muscles.length > 0) {
    const groups = new Set<TopLevelGroup>();
    for (const m of muscles) {
      const top = CATALOG_TO_TOP_LEVEL[m.toLowerCase()];
      if (top) groups.add(top);
    }
    return [...groups];
  }
  const slug = slugFromImageUrl(imageUrl);
  const entry =
    (slug && bySlug.get(slug)) || byName.get(name.toLowerCase());
  return entry ? entryToGroups(entry) : [];
}

export function muscleLabel(group: TopLevelGroup): string {
  return group.charAt(0).toUpperCase() + group.slice(1);
}

// Granular-region resolver mirroring getMuscleGroupsForExercise. Server-side
// only — this module statically imports the ~145KB catalog JSON. Client callers
// that already hold a CatalogEntry should use regionsFromCatalogMuscles() from
// muscle-regions.ts instead (no JSON dependency).
export function getMuscleRegionsForExercise(
  name: string,
  imageUrl: string | null | undefined,
  // Snapshot muscle strings (custom exercises have no catalog slug); when
  // present they win over the slug/name lookup.
  muscles?: string[] | null
): MuscleRegion[] {
  if (muscles && muscles.length > 0) return regionsFromCatalogMuscles(muscles);
  const slug = slugFromImageUrl(imageUrl);
  const entry = (slug && bySlug.get(slug)) || byName.get(name.toLowerCase());
  return entry ? regionsFromCatalogMuscles(entry.primary) : [];
}
