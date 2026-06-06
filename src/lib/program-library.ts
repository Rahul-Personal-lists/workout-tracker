import { PRESET_PROGRAMS, type PresetProgram } from "./starter-program";

export type ProgramGoal = "overall_fitness" | "get_lean" | "build_muscle";
export type ProgramSplit = "full_body" | "upper_lower" | "push_pull" | "ppl";
export type GymLocation = "commercial" | "small_home";
export type Experience = "beginner" | "intermediate_advanced";

type LibraryMeta = {
  goal: ProgramGoal;
  split: ProgramSplit;
  daysPerWeek: number;
  gymLocation: GymLocation;
  experience: Experience;
  heroImage: string;
};

export type LibraryProgram = PresetProgram & LibraryMeta;

// Keyed by PresetProgram.id. A preset with no entry here is left out of the
// library entirely, so a half-authored program never renders with missing
// metadata or a broken hero image.
const LIBRARY_META: Record<string, LibraryMeta> = {
  "starter-12wk": {
    goal: "build_muscle",
    split: "upper_lower",
    daysPerWeek: 4,
    gymLocation: "commercial",
    experience: "intermediate_advanced",
    heroImage: "/program-art/starter-12wk.jpg",
  },
  "ppl-6wk": {
    goal: "build_muscle",
    split: "ppl",
    daysPerWeek: 3,
    gymLocation: "commercial",
    experience: "intermediate_advanced",
    heroImage: "/program-art/ppl-6wk.jpg",
  },
  "upper-lower-8wk": {
    goal: "build_muscle",
    split: "upper_lower",
    daysPerWeek: 4,
    gymLocation: "commercial",
    experience: "intermediate_advanced",
    heroImage: "/program-art/upper-lower-8wk.jpg",
  },
  "full-body-3x-6wk": {
    goal: "overall_fitness",
    split: "full_body",
    daysPerWeek: 3,
    gymLocation: "commercial",
    experience: "beginner",
    heroImage: "/program-art/full-body-3x-6wk.jpg",
  },
  "full-body-2x": {
    goal: "overall_fitness",
    split: "full_body",
    daysPerWeek: 2,
    gymLocation: "commercial",
    experience: "beginner",
    heroImage: "/program-art/full-body-2x.jpg",
  },
  "upper-lower-2x": {
    goal: "build_muscle",
    split: "upper_lower",
    daysPerWeek: 2,
    gymLocation: "commercial",
    experience: "beginner",
    heroImage: "/program-art/upper-lower-2x.jpg",
  },
  "full-body-strength-2x": {
    goal: "build_muscle",
    split: "full_body",
    daysPerWeek: 2,
    gymLocation: "commercial",
    experience: "intermediate_advanced",
    heroImage: "/program-art/full-body-strength-2x.jpg",
  },
  "home-db-full-body": {
    goal: "overall_fitness",
    split: "full_body",
    daysPerWeek: 3,
    gymLocation: "small_home",
    experience: "beginner",
    heroImage: "/program-art/home-db-full-body.jpg",
  },
  "bodyweight-foundations": {
    goal: "overall_fitness",
    split: "full_body",
    daysPerWeek: 3,
    gymLocation: "small_home",
    experience: "beginner",
    heroImage: "/program-art/bodyweight-foundations.jpg",
  },
  "home-fat-loss-circuit": {
    goal: "get_lean",
    split: "full_body",
    daysPerWeek: 3,
    gymLocation: "small_home",
    experience: "beginner",
    heroImage: "/program-art/home-fat-loss-circuit.jpg",
  },
  "lean-recomp-4d": {
    goal: "get_lean",
    split: "upper_lower",
    daysPerWeek: 4,
    gymLocation: "commercial",
    experience: "intermediate_advanced",
    heroImage: "/program-art/lean-recomp-4d.jpg",
  },
  "push-pull-4d": {
    goal: "build_muscle",
    split: "push_pull",
    daysPerWeek: 4,
    gymLocation: "commercial",
    experience: "intermediate_advanced",
    heroImage: "/program-art/push-pull-4d.jpg",
  },
  "ppl-5d": {
    goal: "build_muscle",
    split: "ppl",
    daysPerWeek: 5,
    gymLocation: "commercial",
    experience: "intermediate_advanced",
    heroImage: "/program-art/ppl-5d.jpg",
  },
  "lean-athlete-5d": {
    goal: "get_lean",
    split: "push_pull",
    daysPerWeek: 5,
    gymLocation: "commercial",
    experience: "intermediate_advanced",
    heroImage: "/program-art/lean-athlete-5d.jpg",
  },
  "ppl-6d": {
    goal: "build_muscle",
    split: "ppl",
    daysPerWeek: 6,
    gymLocation: "commercial",
    experience: "intermediate_advanced",
    heroImage: "/program-art/ppl-6d.jpg",
  },
  "push-pull-6d": {
    goal: "build_muscle",
    split: "push_pull",
    daysPerWeek: 6,
    gymLocation: "commercial",
    experience: "intermediate_advanced",
    heroImage: "/program-art/push-pull-6d.jpg",
  },
  "lean-circuit-2x": {
    goal: "get_lean",
    split: "full_body",
    daysPerWeek: 2,
    gymLocation: "commercial",
    experience: "beginner",
    heroImage: "/program-art/lean-circuit-2x.jpg",
  },
  "upper-lower-fitness-4d": {
    goal: "overall_fitness",
    split: "upper_lower",
    daysPerWeek: 4,
    gymLocation: "commercial",
    experience: "beginner",
    heroImage: "/program-art/upper-lower-fitness-4d.jpg",
  },
  "total-fitness-5d": {
    goal: "overall_fitness",
    split: "upper_lower",
    daysPerWeek: 5,
    gymLocation: "commercial",
    experience: "intermediate_advanced",
    heroImage: "/program-art/total-fitness-5d.jpg",
  },
  "lean-ppl-6d": {
    goal: "get_lean",
    split: "ppl",
    daysPerWeek: 6,
    gymLocation: "commercial",
    experience: "intermediate_advanced",
    heroImage: "/program-art/lean-ppl-6d.jpg",
  },
  "total-fitness-6d": {
    goal: "overall_fitness",
    split: "ppl",
    daysPerWeek: 6,
    gymLocation: "commercial",
    experience: "intermediate_advanced",
    heroImage: "/program-art/total-fitness-6d.jpg",
  },
};

export const LIBRARY_PROGRAMS: LibraryProgram[] = PRESET_PROGRAMS.filter(
  (p) => p.id in LIBRARY_META,
).map((p) => ({ ...p, ...LIBRARY_META[p.id] }));

export function getLibraryProgram(id: string): LibraryProgram | undefined {
  return LIBRARY_PROGRAMS.find((p) => p.id === id);
}

export type LibraryFilters = {
  gymLocation?: GymLocation;
  experience?: Experience;
};

export type DaySection = { daysPerWeek: number; programs: LibraryProgram[] };

// Filtered by the two Stage-1 facets, then grouped into "N Days a Week"
// sections sorted ascending (2 → 6). Pure — safe to call from RSC or client.
export function getLibraryPrograms(filters: LibraryFilters = {}): DaySection[] {
  const matched = LIBRARY_PROGRAMS.filter(
    (p) =>
      (!filters.gymLocation || p.gymLocation === filters.gymLocation) &&
      (!filters.experience || p.experience === filters.experience),
  );

  const byDays = new Map<number, LibraryProgram[]>();
  for (const p of matched) {
    const group = byDays.get(p.daysPerWeek) ?? [];
    group.push(p);
    byDays.set(p.daysPerWeek, group);
  }

  return [...byDays.entries()]
    .sort(([a], [b]) => a - b)
    .map(([daysPerWeek, programs]) => ({ daysPerWeek, programs }));
}

// Label + color token per goal. Colors live in globals.css @theme
// (--color-goal-*), so the goal label stays theme-aware, not hardcoded hex.
export const GOAL_META: Record<ProgramGoal, { label: string; color: string }> = {
  build_muscle: { label: "Build Muscle", color: "text-goal-build-muscle" },
  get_lean: { label: "Get Lean", color: "text-goal-get-lean" },
  overall_fitness: { label: "Overall Fitness", color: "text-goal-overall-fitness" },
};

export const SPLIT_LABEL: Record<ProgramSplit, string> = {
  full_body: "Full Body",
  upper_lower: "Upper / Lower",
  push_pull: "Push / Pull",
  ppl: "Push / Pull / Legs",
};
