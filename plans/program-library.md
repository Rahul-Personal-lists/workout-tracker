# Plan: Program Library (browse → program → plans → plan detail)

Goal: build the reference app's **program Library** — the screens that group programs
by "N Days a Week", filter by Gym Location + Experience, and drill a program down into
`PLAN 1 / PLAN 2 …` with a stat row + "Start This Plan". (Reference screenshots:
`improvments/5–12.jpeg`.) This is the one reference feature deliberately deferred from
the body-map / favorites / badges / estimates PR (#94).

Build it in **stages** — each stage is independently reviewable and (mostly) shippable.

---

## Status — Stages 0–4 shipped; only catalog expansion (Q1) is deferred

_Updated 2026-06-05. Legend: ✅ done · 🟡 partial · ⬜ not started._

| Stage | Status | Notes |
|---|---|---|
| 0 — Data model + catalog | ✅ | Types, `LIBRARY_PROGRAMS`, `getLibraryPrograms`, goal-color tokens, 4 hero photos. **Only the 4 existing presets are tagged** — the "~8–15 more" are NOT authored (Q1 still open; content, not code). |
| 1 — Library list + filters | ✅ | `/program/library` + filter sheets + day-grouped cards + both entry points. |
| 2 — Program → PLANS list | ✅ | `[programId]` landing + PLANS rows + sticky "Start This Program" CTA (seeds; respects max-2). |
| 3 — Plan detail | ✅ | `[programId]/[dayId]` replaced the stub: back header + Plan N + plan-tabs pill row + `PlanStats` row + exercise rows (`ExerciseThumb` + `MuscleBadge` + sets×reps/from-weight) + sticky Start CTA. Keyed by `day_number`, training days only. |
| 4 — Integration / max-2 / polish | ✅ | Entry points ✅. Graceful 2-program-cap flow: `StartProgramButton` opens an archive-one sheet (lists the user's programs → `archiveProgram` then `seedPresetProgram`) instead of a dead-end toast; direct-seed failures below the cap still toast. Token/a11y polish + doc updates done. Catalog expansion (Q1) remains the only open item. |

### As-built decisions (deviations from the design below — read before Stage 3/4)

- **Library list is static (no `force-dynamic`).** It reads no per-user data; the client list imports the catalog directly (no server→client props), unlike its `/program/*` siblings.
- **Filters are local React state, not URL params.**
- **Filter sheets are a co-located generic `FilterSheet`** (single-select radio) on `useDialog` + `ConfirmSheet`'s sheet shell — *not* `ConfirmSheet` itself (that's confirm/cancel only).
- **Hero + card ratio is `aspect-[3/2]`** to match the generated photos with zero crop (prompts reserved the lower third for the overlay). A touch tall in a list — switch to 16:9 if preferred.
- **`daysPerWeek` is authored in metadata**, not derived from non-rest days.
- **Plan-detail id = `day_number`** (`[programId]/[dayId]`), so rest days don't skew PLAN numbering.
- **Preset metadata:** all 4 are `commercial`; goals = `build_muscle` ×3 + `overall_fitness` (Full Body 3x); experience = `beginner` (Full Body 3x) + `intermediate_advanced` ×3. ⇒ `get_lean`, `push_pull`, `small_home`, and the 2/5/6-day sections are **empty** until the catalog is expanded.
- **Verification gap:** the dev checkout has **no Supabase env**, so live auth/seed/visual checks couldn't run. Verified via typecheck + lint + production build + Tailwind-class generation + a data-layer smoke test. The seed→redirect and the cap toast still want a real in-browser click.

### Files (Stages 0–2)

- `src/lib/program-library.ts` — catalog layer (types, `LIBRARY_PROGRAMS`, `getLibraryProgram`, `getLibraryPrograms`, `GOAL_META`, `SPLIT_LABEL`).
- `src/app/globals.css` — `--color-goal-{build-muscle,get-lean,overall-fitness}` tokens.
- `public/program-art/{starter-12wk,ppl-6wk,upper-lower-8wk,full-body-3x-6wk}.jpg` — hero photos.
- `src/app/(app)/program/library/page.tsx` + `library-list.tsx` — list screen.
- `src/app/(app)/program/library/[programId]/page.tsx` + `start-program-button.tsx` — PLANS landing + seed CTA.
- `src/app/(app)/program/library/[programId]/[dayId]/page.tsx` — **stub** (Stage 3 replaces).
- Edited `src/app/(app)/program/page.tsx` + `program/new/page.tsx` — "Browse the library" entry links.

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

> **✅ Done** — except catalog expansion. Types/helper/tokens/4 hero photos shipped and the 4 presets are tagged; the "~8–15 more" programs are **not** authored (Q1 still open).

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

> **✅ Done.** See the Status table + As-built decisions (filters are local state, not URL params; sheets are a generic `FilterSheet`).

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

> **✅ Done.** Landing renders hero + goal + split + PLANS rows (one per training day, id = `day_number`). Sticky "Start This Program" CTA seeds via `seedPresetProgram` (cap-respecting). Rows link to the Stage 3 stub.

- New route `src/app/(app)/program/library/[programId]/page.tsx`.
- Header: hero + goal + split + "{split}, {daysPerWeek} Days a Week".
- **PLANS list:** one row per program day → `PLAN 1`, `PLAN 2`, … (label = day title, e.g.
  "Push"), chevron, tappable → plan detail. Read-only from catalog data (nothing seeded).
- A persistent bottom **"Start This Program"** CTA (seeds via `seedPresetProgram`).

**Acceptance:** PLANS list renders from preset days; Start CTA seeds (respecting max-2).

## Stage 3 — Plan detail

> **✅ Done.** `[programId]/[dayId]/page.tsx` (keyed by `day_number`, training days only) renders the full plan: back header + "Plan N" + a plan-tabs pill row (server `Link`s, not a swipe carousel) + `PlanStats` + exercise rows (`ExerciseThumb` + `MuscleBadge` + sets×reps/from-weight) + sticky Start CTA. `force-dynamic` (reads user weight + program count).

- New route `…/library/[programId]/[dayId]/page.tsx` (or a query param). **(Route chosen; stub in place.)**
- Header: day name ("Push"); **stat row** via `PlanStats` (reuse — `6 Exercises / ~66 min
  / ~443 cal`).
- Exercise rows: thumbnail + name + sets×reps (or duration) + **`MuscleBadge`** (reuse).
- Optional **day carousel** (dots) to swipe between the program's plans (reuse `DayTabs`
  pattern or scroll-snap).
- Sticky **"Start This Program"** CTA (same seed action).

**Acceptance:** plan detail shows exercises + stats + badges; carousel switches days; Start
seeds.

## Stage 4 — Integration, max-2 flow, polish

> **✅ Done.** Entry points wired. The Start CTA now routes the 2-program cap into an archive-one sheet (`StartProgramButton` lists the user's non-archived programs → `archiveProgram` then `seedPresetProgram`, redirecting on success); below the cap it seeds directly and toasts only on an unexpected failure. Focus rings / theme tokens / pinch-zoom intact. Docs updated (this file + CLAUDE.md routes + `.claude/sessions.md`). Catalog expansion (Q1) is the one remaining deferral.

- Wire entry points; ensure `/program/new` keeps "build your own". **(✅ done — links from `/program` empty state + `/program/new`.)**
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
   — **🟡 STILL OPEN.** Only the 4 existing presets are tagged. Expansion (and the art for
   it — Q2) is deferred pending your call. Until then several filter facets/day-sections are empty.
2. **Hero images** — provide photos (`public/program-art/`), or ship gradient placeholders
   first and add art later?
   — **✅ RESOLVED (photos).** You generated the 4 hero photos; they're in `public/program-art/`.
   Any new programs from Q1 will each need art (a photo, or a gradient fallback — not yet built).
3. **Scope** — full filterable library (Stages 1–4), or a **lighter v1**: just the 4 existing
   presets as nicer hero cards grouped by days-per-week, no gym/experience filters? (The
   lighter version is Stage 1 minus the bottom-sheet filters + Stage 0 metadata only.)
   — **✅ RESOLVED.** Going with the full filterable library (filters + sheets shipped in Stage 1).
4. **"Start This Plan" semantics** — confirm it seeds the whole program (recommended), vs.
   somehow starting a single day in isolation (doesn't fit the program/session model).
   — **✅ RESOLVED.** Seeds the whole program via `seedPresetProgram` (implemented in Stage 2).

## Out of scope

Premium/paywall; a DB-backed editable program-template store; per-program analytics;
importing third-party program files.
