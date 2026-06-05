// Granular muscle taxonomy (~17 regions) used by the interactive body map (F1),
// the per-exercise muscle badge (F3), and the tap-to-filter bridge.
//
// This is a SEPARATE module from `muscle-groups.ts` on purpose: muscle-groups.ts
// statically imports the ~145KB catalog JSON and is only ever pulled in by
// server code. This file imports NOTHING (it references anatomy polygons by
// their string keys, not their coordinates), so it is safe to import from client
// components without dragging the catalog into the client bundle.
//
// The existing 8-group `TopLevelGroup` layer in muscle-groups.ts is left intact —
// it still backs the read-only /progress heatmap. This granular layer sits
// alongside it.

export type MuscleRegion =
  | "chest"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "forearms"
  | "abs"
  | "traps"
  | "lats"
  | "middle_back"
  | "lower_back"
  | "glutes"
  | "quads"
  | "hamstrings"
  | "adductors"
  | "abductors"
  | "calves"
  | "neck";

export type BodyView = "front" | "back";

export type MuscleRegionMeta = {
  key: MuscleRegion;
  label: string;
  // Which side(s) of the figure this region lives on.
  view: BodyView | "both";
  // Catalog `primary[]` muscle strings (from free-exercise-db) that map here.
  catalogMuscles: string[];
  // anatomy-data.ts polygon `muscle` keys this region highlights.
  polygons: string[];
};

// Order matters: where two regions share a polygon, the EARLIER entry "owns" the
// tap target. `lats` owns UPPER_BACK over `middle_back`; `adductors` owns the
// front inner-thigh ABDUCTORS polygon over `abductors`. (anatomy-data has no
// separate lats/middle-back geometry, and its inner/outer thigh polygons are
// coarse — see the foundation notes.)
export const MUSCLE_REGIONS: MuscleRegionMeta[] = [
  { key: "chest", label: "Chest", view: "front", catalogMuscles: ["chest"], polygons: ["CHEST"] },
  { key: "shoulders", label: "Shoulders", view: "both", catalogMuscles: ["shoulders"], polygons: ["FRONT_DELTOIDS", "BACK_DELTOIDS"] },
  { key: "biceps", label: "Biceps", view: "front", catalogMuscles: ["biceps"], polygons: ["BICEPS"] },
  { key: "triceps", label: "Triceps", view: "both", catalogMuscles: ["triceps"], polygons: ["TRICEPS_FRONT", "TRICEPS_BACK"] },
  { key: "forearms", label: "Forearms", view: "both", catalogMuscles: ["forearms"], polygons: ["FOREARM_FRONT", "FOREARM_BACK"] },
  { key: "abs", label: "Abs", view: "front", catalogMuscles: ["abdominals"], polygons: ["ABS", "OBLIQUES"] },
  { key: "traps", label: "Traps", view: "back", catalogMuscles: ["traps"], polygons: ["TRAPEZIUS"] },
  { key: "lats", label: "Lats", view: "back", catalogMuscles: ["lats"], polygons: ["UPPER_BACK"] },
  { key: "middle_back", label: "Middle Back", view: "back", catalogMuscles: ["middle back"], polygons: ["UPPER_BACK"] },
  { key: "lower_back", label: "Lower Back", view: "back", catalogMuscles: ["lower back"], polygons: ["LOWER_BACK"] },
  { key: "glutes", label: "Glutes", view: "back", catalogMuscles: ["glutes"], polygons: ["GLUTEAL"] },
  { key: "quads", label: "Quads", view: "front", catalogMuscles: ["quadriceps"], polygons: ["QUADRICEPS"] },
  { key: "hamstrings", label: "Hamstrings", view: "back", catalogMuscles: ["hamstrings"], polygons: ["HAMSTRING"] },
  { key: "adductors", label: "Adductors", view: "front", catalogMuscles: ["adductors"], polygons: ["ABDUCTORS"] },
  { key: "abductors", label: "Abductors", view: "both", catalogMuscles: ["abductors"], polygons: ["ABDUCTORS", "ABDUCTOR_BACK"] },
  { key: "calves", label: "Calves", view: "both", catalogMuscles: ["calves"], polygons: ["CALVES_FRONT", "CALVES_BACK", "LEFT_SOLEUS", "RIGHT_SOLEUS"] },
  { key: "neck", label: "Neck", view: "front", catalogMuscles: ["neck"], polygons: ["NECK"] },
];

export const REGION_META: Record<MuscleRegion, MuscleRegionMeta> = Object.fromEntries(
  MUSCLE_REGIONS.map((r) => [r.key, r])
) as Record<MuscleRegion, MuscleRegionMeta>;

// region -> anatomy polygon keys (for highlighting a region on the figure).
export const REGION_TO_POLYGONS: Record<MuscleRegion, string[]> = Object.fromEntries(
  MUSCLE_REGIONS.map((r) => [r.key, r.polygons])
) as Record<MuscleRegion, string[]>;

// anatomy polygon key -> region (for tap-to-select). First region to claim a
// shared polygon wins (see ordering note above); polygons not owned by any
// region (HEAD/KNEES) stay undefined and render as a non-interactive silhouette.
export const POLYGON_TO_REGION: Record<string, MuscleRegion | undefined> = (() => {
  const map: Record<string, MuscleRegion> = {};
  for (const r of MUSCLE_REGIONS) {
    for (const p of r.polygons) {
      if (!(p in map)) map[p] = r.key;
    }
  }
  return map;
})();

// catalog `primary[]` string -> region.
const CATALOG_TO_REGION: Record<string, MuscleRegion> = (() => {
  const map: Record<string, MuscleRegion> = {};
  for (const r of MUSCLE_REGIONS) {
    for (const m of r.catalogMuscles) map[m] = r.key;
  }
  return map;
})();

// Bridge from a granular region to the COARSE 8-label filter the exercise
// library's pill row already uses (`MUSCLE_GROUPS` in exercise-catalog.ts).
// Every region maps to a real pill label so a body-map tap always lights a pill.
// Note: the catalog's "Legs" pill already covers glutes/adductors/abductors, and
// the "Shoulders" pill covers neck — there is no dedicated Glutes/Neck pill.
export const REGION_TO_COARSE_LABEL: Record<MuscleRegion, string> = {
  chest: "Chest",
  shoulders: "Shoulders",
  neck: "Shoulders",
  biceps: "Arms",
  triceps: "Arms",
  forearms: "Arms",
  abs: "Abs",
  traps: "Back",
  lats: "Back",
  middle_back: "Back",
  lower_back: "Back",
  glutes: "Legs",
  quads: "Legs",
  hamstrings: "Legs",
  adductors: "Legs",
  abductors: "Legs",
  calves: "Calves",
};

const REGION_KEYS = new Set<string>(MUSCLE_REGIONS.map((r) => r.key));

export function isMuscleRegion(x: string | null | undefined): x is MuscleRegion {
  return x != null && REGION_KEYS.has(x);
}

export function regionLabel(region: MuscleRegion): string {
  return REGION_META[region].label;
}

// Resolve catalog `primary[]` muscle strings to regions WITHOUT touching the
// catalog JSON — callers that already hold a CatalogEntry use this so the badge
// stays out of the client bundle's JSON dependency.
export function regionsFromCatalogMuscles(primary: string[]): MuscleRegion[] {
  const regions = new Set<MuscleRegion>();
  for (const m of primary) {
    const r = CATALOG_TO_REGION[m.toLowerCase()];
    if (r) regions.add(r);
  }
  return [...regions];
}

// Which side(s) a set of regions occupies — drives the badge's "auto" view.
export function viewsForRegions(regions: MuscleRegion[]): {
  front: boolean;
  back: boolean;
} {
  let front = false;
  let back = false;
  for (const region of regions) {
    const v = REGION_META[region]?.view;
    if (v === "front" || v === "both") front = true;
    if (v === "back" || v === "both") back = true;
  }
  return { front, back };
}
