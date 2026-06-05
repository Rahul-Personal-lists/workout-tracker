# Plan: Program Library (browse → program → plans → plan detail)

Goal: build the reference app's **program Library** — the screens that group programs
by "N Days a Week", filter by Gym Location + Experience, and drill a program down into
`PLAN 1 / PLAN 2 …` with a stat row + "Start This Plan". (Reference screenshots:
`improvments/5–12.jpeg`.) This is the one reference feature deliberately deferred from
the body-map / favorites / badges / estimates PR (#94).

Build it in **stages** — each stage is independently reviewable and (mostly) shippable.

---

## Key design decisions (read first)

1. **Presets stay code-data, not a DB table.** This app is personal + single-user with a
   hard cap of **2 programs** (`MAX_PROGRAMS = 2`, `assertSlotAvailable`, the
   `programs_one_active_per_user` partial unique index). The Library is a *richer preset
   picker*, not a per-user content store. Define the catalog as version-controlled data
   (extend `src/lib/starter-program.ts` or add `src/lib/program-library.ts`). No new
   user-data tables, no admin, no `program_templates` table.
2. **"Start This Plan" = seed the whole program.** In the reference, a "plan" is one
   training day inside a program. Tapping "Start This Plan" / "Use this program" should
   call the existing **`seedPresetProgram`** flow (which already demotes the active program
   and respects the 2-program cap). Plan detail is a *preview* of a day before seeding.
3. **No 5th nav tab.** The bottom nav is intentionally 4 tabs (`grid-cols-4`, hides on
   `/workout`). The Library is a route under `/program` (e.g. `/program/library`), reached
   from the empty state and `/program/new` — exactly like `/program/exercises`.
4. **No "Premium" gating.** Drop the crown/paywall from the reference — irrelevant here.
5. **Max-2 handling.** Seeding from the Library when already at 2 programs must route into
   the existing "archive one first" path, not silently fail.

## Reuse (already built — don't rebuild)

- **`PlanStats`** (`src/components/plan-stats.tsx`) + **`src/lib/estimates.ts`** → the
  `N exercises · ~min · ~cal` stat row on plan detail.
- **`MuscleBadge`** (`src/components/muscle-badge.tsx`) + `getMuscleRegionsForExercise` →
  the per-exercise target-muscle icon on plan-detail rows.
- **`seedPresetProgram`** (`src/app/actions/program.ts`) + `PRESET_PROGRAMS` /
  `StarterProgram` types (`src/lib/starter-program.ts`) → seeding.
- **`ConfirmSheet` / `useDialog`** (`src/components/confirm-sheet.tsx`,
  `src/lib/use-dialog.ts`) → the bottom-sheet filter selectors.
- **`ExerciseAnimation` / `ExerciseThumb`** → plan-detail exercise thumbnails.
- **`DayTabs`** pattern → the plan carousel/dots if wanted.
- `preset-preview.tsx` already renders a day's exercises + a `PlanStats` line — a good
  starting point for the plan-detail layout.

---

## Stage 0 — Data model + catalog content

Add metadata to the preset type and author enough programs to populate the sections.

- Extend the preset type (in `starter-program.ts` or a new `program-library.ts`):
  ```ts
  type ProgramGoal = "overall_fitness" | "get_lean" | "build_muscle";
  type ProgramSplit = "full_body" | "upper_lower" | "push_pull" | "ppl";
  type GymLocation = "commercial" | "small_home";
  type Experience  = "beginner" | "intermediate_advanced";

  type LibraryProgram = PresetProgram & {
    goal: ProgramGoal;
    split: ProgramSplit;
    daysPerWeek: number;          // 2..6 — drives the section grouping
    gymLocation: GymLocation;
    experience: Experience;
    heroImage: string;            // /program-art/<slug>.jpg (see assets note)
  };
  ```
- Tag the existing 4 presets with metadata, then author **~8–15 more** so each
  "N Days a Week" section (2–6) has a few cards across goals/splits. Keep the
  progression math conventions from `starter-program.ts` (plate jumps, `progression_weeks`,
  `peak_taper`). **Flag to Rahul** before inventing programs — he has opinions on
  programming; consider seeding from known templates (PPL, Upper/Lower, Full Body, etc.).
- **Assets:** hero images per program. Either (a) Rahul supplies photos (like the body-map
  images → `public/program-art/`), or (b) use a CSS gradient + goal-colored accent bar as a
  placeholder (cheaper, ship-now). Decide before Stage 1.
- Goal label colors (match reference): Overall Fitness = red/rose, Get Lean = teal, Build
  Muscle = orange. Map to theme-aware tokens, not hardcoded hex.

**Acceptance:** types compile; a `LIBRARY_PROGRAMS` array exists with metadata; a
`getLibraryPrograms(filters)` pure helper returns filtered + grouped-by-days results.

## Stage 1 — Library list screen + filters

- New route `src/app/(app)/program/library/page.tsx` (RSC) + a client list component.
- Two filter triggers (pills) → **bottom-sheets** (reuse `ConfirmSheet`/`useDialog`):
  "Gym Location" (Commercial / Small & Home) and "Gym Experience"
  (Beginner / Intermediate & Advanced). Persist selection in local state (or URL params).
- Group filtered programs into **"N Days a Week"** sections (sorted 2→6), each a section
  header + horizontally-readable program cards.
- **Program card:** hero image (or gradient), colored **goal label**, **split name**.
  Full-bleed, rounded, tappable → `/program/library/[programId]`.
- Reached from: `/program` empty state and `/program/new` ("Browse the library" link).

**Acceptance:** filtering + day-grouping works; cards render; tapping a card navigates.

## Stage 2 — Program → PLANS list

- New route `src/app/(app)/program/library/[programId]/page.tsx`.
- Header: hero + goal + split + "{split}, {daysPerWeek} Days a Week".
- **PLANS list:** one row per program day → `PLAN 1`, `PLAN 2`, … (label = day title, e.g.
  "Push"), chevron, tappable → plan detail. Read-only from catalog data (nothing seeded).
- A persistent bottom **"Start This Program"** CTA (seeds via `seedPresetProgram`).

**Acceptance:** PLANS list renders from preset days; Start CTA seeds (respecting max-2).

## Stage 3 — Plan detail

- New route `…/library/[programId]/[dayId]/page.tsx` (or a query param).
- Header: day name ("Push"); **stat row** via `PlanStats` (reuse — `6 Exercises / ~66 min
  / ~443 cal`).
- Exercise rows: thumbnail + name + sets×reps (or duration) + **`MuscleBadge`** (reuse).
- Optional **day carousel** (dots) to swipe between the program's plans (reuse `DayTabs`
  pattern or scroll-snap).
- Sticky **"Start This Program"** CTA (same seed action).

**Acceptance:** plan detail shows exercises + stats + badges; carousel switches days; Start
seeds.

## Stage 4 — Integration, max-2 flow, polish

- Wire entry points; ensure `/program/new` keeps "build your own".
- **At 2-program cap:** seeding from the Library routes to the existing archive-one flow
  (reuse `program-switcher` / `archiveProgram`) instead of erroring.
- Empty/loading states, `:focus-visible` rings, pinch-zoom intact, theme-token colors.
- Update `CLAUDE.md` routes + `.claude/sessions.md`. Add hero assets to `public/`.

**Acceptance:** end-to-end browse → preview → seed works from a clean state and at the
2-program cap; typecheck + lint + build green; adversarial review pass.

---

## Open questions for Rahul (resolve before/early in the PR)

1. **Program content** — supply the additional programs, or have me draft them from
   standard templates for your review? (Affects Stage 0 the most.)
2. **Hero images** — provide photos (`public/program-art/`), or ship gradient placeholders
   first and add art later?
3. **Scope** — full filterable library (Stages 1–4), or a **lighter v1**: just the 4 existing
   presets as nicer hero cards grouped by days-per-week, no gym/experience filters? (The
   lighter version is Stage 1 minus the bottom-sheet filters + Stage 0 metadata only.)
4. **"Start This Plan" semantics** — confirm it seeds the whole program (recommended), vs.
   somehow starting a single day in isolation (doesn't fit the program/session model).

## Out of scope

Premium/paywall; a DB-backed editable program-template store; per-program analytics;
importing third-party program files.
