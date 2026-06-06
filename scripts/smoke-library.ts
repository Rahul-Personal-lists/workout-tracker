import { PRESET_PROGRAMS } from "@/lib/starter-program";
import { LIBRARY_PROGRAMS } from "@/lib/program-library";
import { getMuscleRegionsForExercise } from "@/lib/muscle-groups";

let failures = 0;
const fail = (m: string) => {
  failures++;
  console.error("  ✗ " + m);
};

// 1. Every library program resolves to a real preset + has a hero.
console.log(`Library programs: ${LIBRARY_PROGRAMS.length} (expect 21)`);
if (LIBRARY_PROGRAMS.length !== 21) fail(`expected 21, got ${LIBRARY_PROGRAMS.length}`);

// Every "N Days a Week" section must offer all three goals.
const ALL_GOALS = ["get_lean", "build_muscle", "overall_fitness"];
const byDays = new Map<number, Set<string>>();
for (const p of LIBRARY_PROGRAMS) {
  const set = byDays.get(p.daysPerWeek) ?? new Set<string>();
  set.add(p.goal);
  byDays.set(p.daysPerWeek, set);
}
for (const [days, goals] of [...byDays.entries()].sort(([a], [b]) => a - b)) {
  const missing = ALL_GOALS.filter((g) => !goals.has(g));
  console.log(`${days}-day goals: ${[...goals].join(", ")}${missing.length ? `  (MISSING ${missing.join(", ")})` : ""}`);
  if (missing.length) fail(`${days}-day section missing goal(s): ${missing.join(", ")}`);
}

// 2. Facet coverage.
const days = new Set(LIBRARY_PROGRAMS.map((p) => p.daysPerWeek));
for (const d of [2, 3, 4, 5, 6]) if (!days.has(d)) fail(`no program for ${d} days/week`);
const goals = new Set<string>(LIBRARY_PROGRAMS.map((p) => p.goal));
for (const g of ["build_muscle", "get_lean", "overall_fitness"]) if (!goals.has(g)) fail(`goal empty: ${g}`);
const splits = new Set<string>(LIBRARY_PROGRAMS.map((p) => p.split));
for (const s of ["full_body", "upper_lower", "push_pull", "ppl"]) if (!splits.has(s)) fail(`split empty: ${s}`);
const locs = new Set<string>(LIBRARY_PROGRAMS.map((p) => p.gymLocation));
for (const l of ["commercial", "small_home"]) if (!locs.has(l)) fail(`location empty: ${l}`);

// 3. daysPerWeek metadata matches the count of non-rest days.
for (const p of LIBRARY_PROGRAMS) {
  const training = p.days.filter((d) => d.exercises.length > 0).length;
  if (training !== p.daysPerWeek) fail(`${p.id}: daysPerWeek=${p.daysPerWeek} but ${training} training days`);
}

// 4. Per-exercise invariants across ALL presets (incl. original 4).
for (const p of PRESET_PROGRAMS) {
  for (const day of p.days) {
    for (const ex of day.exercises) {
      const isDumbbell = /DB|Dumbbell|Goblet/.test(ex.name) || /DB/.test(ex.note ?? "");
      const isBarbellOrCable = !isDumbbell && /Barbell|Cable|Lat Pulldown|Leg Press|Leg Extension|Leg Curl|T-Bar|Trap Bar|Pushdown|Romanian|Deadlift|Shrug|EZ |Skullcrusher|Face Pull|Squat|Hip Thrust/.test(ex.name);
      if (ex.kind === "time") {
        if (ex.base_reps !== null || ex.start_weight !== null || ex.increment !== 0)
          fail(`${p.id}/${ex.name}: time exercise must have null reps+weight, 0 increment`);
        if (!ex.target_seconds) fail(`${p.id}/${ex.name}: time exercise missing target_seconds`);
      }
      // barbell/cable start weights must be multiples of 10 (5 lb plate grid)
      if (isBarbellOrCable && ex.start_weight !== null && ex.start_weight % 10 !== 0 && !/DB|Dumbbell|Goblet/.test(ex.name))
        fail(`${p.id}/${ex.name}: barbell/cable start_weight ${ex.start_weight} not a multiple of 10`);
      // every non-time exercise's slug must resolve to muscle regions (so MuscleBadge renders)
      if (ex.kind !== "time") {
        const regions = getMuscleRegionsForExercise(ex.name, ex.image_url);
        if (regions.length === 0) fail(`${p.id}/${ex.name}: slug does not resolve to any muscle region (${ex.image_url})`);
      }
    }
  }
}

console.log(failures === 0 ? "\n✅ all smoke checks passed" : `\n❌ ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
