# Tutorial refresh — "Make your first program" copy + new "Add your own exercises" tour

**Date:** 2026-06-15
**Branch:** `feat/tutorial-refresh`
**Status:** approved design, pre-implementation

## Problem

The two onboarding tours (`tutorial-overlay.tsx` + `lib/stores/tutorial.ts`) have drifted from the
app as it shipped new features:

1. **"Make your first program" (`createProgram`) ignores the Program Library.** The empty `/program`
   screen now has three entry points — the 4 quick-pick preset cards, a **"Browse the program
   library"** link (the Stage-5 catalog: programs grouped by days/week, filterable by gym &
   experience), and "Create blank program." The tour only covers the cards (step 1) and the blank
   builder (steps 3–7); it never mentions the library — the very "new templates" we want surfaced.
   Step 2 is also stale: it points at "Create blank program" claiming *"tap here to build from a
   blank program — we'll walk you through it,"* but that button now opens a **chooser**
   (`/program/new`), and the tour then teleports straight to `/program/new/custom`.

2. **No tour tells users they can add their own exercises.** Custom exercises (record / upload /
   photo) are fully built (`/program/exercises` → "Add exercise" → `/program/exercises/new`) but
   undiscoverable to someone who doesn't go looking.

## Scope decisions (locked)

- **Change 1 is a minimal copy fix**, not a restructure: no new steps, no new anchors, no store
  changes. `createProgram` stays at 7 steps.
- **Change 2 is a new standalone tour**, matching the existing two-tour pattern (picker option +
  Settings → Help replay).
- **Existing users discover the new tour via Settings → Help only** — no welcome-picker re-prompt,
  so **no store version bump.**

## Change 1 — refresh `createProgram` copy

Two string edits in `TOUR_STEPS.createProgram` in `src/components/tutorial-overlay.tsx`. Nothing
else changes (step count, anchors, store, picker caption all untouched).

**Step 1** (`preset-templates`, spotlight on the first quick-pick card) — fold the library mention
in here, since the library link sits directly below these cards and is thematically "more
templates":

> **Use a template** — "Fastest start — tap 'Use this program' on one of these and you're training
> today. These are just quick picks; the full library (below) has the whole catalog — grouped by
> days per week, filterable by gym and experience."

**Step 2** (`open-new-program`, spotlight on the "Create blank program" button) — fix the framing:

> **Or build your own** — "Want full control? Tap 'Create blank program' to start from scratch —
> we'll walk you through it next."

**Deliberate call:** no hardcoded program count in the copy ("the whole catalog", not "21 plans").
A static tutorial string can't read `LIBRARY_PROGRAMS.length` the way the `/program/new` chooser
does, so a number would just become the next stale string. Describing *how* it's organized ages
better.

## Change 2 — new "Add your own exercises" tour (`addExercise`)

A 2-step tour. **It starts on `/program/exercises`, not `/program`** — the "Exercises" link only
renders on the *populated* program hub, so a brand-new user (no program yet, which is exactly when
the welcome picker fires) wouldn't have it. Starting on the exercises page sidesteps that and is
more on-topic.

**Steps** (`TOUR_STEPS.addExercise`):

| # | target (`data-tour`) | route | title | body |
|---|---|---|---|---|
| 1 | `add-exercise` | `/program/exercises` | Add your own exercise | "Missing a move from the library? Tap here to add your own — record a clip, upload a video (a screen recording works great), or snap a photo." |
| 2 | `custom-media` | `/program/exercises/new` | Three ways to capture it | "Record up to 80 seconds with your camera, upload a video you already have, or add a single photo. Pick whatever's easiest." |

Ends on the create form with the media options highlighted — same shape as `createProgram` ending
on the builder.

### Files touched

- **`src/lib/stores/tutorial.ts`**
  - `TourId` union → add `"addExercise"`.
  - `TUTORIAL_STEP_COUNT` → `addExercise: 2`.
  - `initialHasSeen` / `initialAutoStart` / `initialStep` → add the `addExercise` key (required for
    the `Record<TourId, …>` types to compile).
  - **No `version` bump and no new migration logic** (no re-prompt). Existing persisted state
    (`{pickerSeen, hasSeen}` at v3) lacks the `addExercise` key → reads as `undefined` → falsy =
    correct "not seen" default. `autoStart`/`step` are not persisted (runtime-only) so they
    re-initialize with the new key.
  - **Mechanical type fixups expected (verify with `tsc`):** widening `TourId` makes
    `Record<TourId, boolean>` require the new key, so the existing `migrate` branches that build
    `hasSeen` object literals (the v<2 / v<3 paths) likely need `addExercise: false` added, and the
    final `as` cast already compiles. These are type-compatibility edits, not behavior changes.
- **`src/components/tutorial-overlay.tsx`** — add the `TOUR_STEPS.addExercise` array above.
- **`src/components/onboarding-picker.tsx`**
  - `OPTIONS` → `{ tour: "addExercise", title: "Add your own exercises", caption: "2 steps · record, upload, or photo", route: "/program/exercises" }`.
  - `open` gate → add `&& !autoStartAddExercise` (read `autoStart.addExercise`), for consistency
    with the other two.
  - `completed` record → add `addExercise: hasSeenAddExercise`.
- **`src/components/onboarding-redirector.tsx`** — read `hasSeen.addExercise`; add `|| !hasSeenAddExercise`
  to the early-return guard so the "all tours seen → go to settings" cleanup only fires once all
  three are done. (No behavior change for already-onboarded users: they hit the `pickerSeen` guard
  first.)
- **`src/components/settings-replay-tutorials.tsx`** — `ENTRIES` → `{ tour: "addExercise", label: "Replay: Add your own exercises", route: "/program/exercises" }`.
- **`src/app/(app)/program/exercises/page.tsx`** — add `data-tour="add-exercise"` to the "Add
  exercise" `Link` (line ~41).
- **`src/app/(app)/program/exercises/new/create-custom-exercise-client.tsx`** — add
  `data-tour="custom-media"` to the container wrapping the three chooser buttons (Add photo /
  Record with camera / Upload). The chooser is the create page's initial state, so the anchor is
  present on a fresh navigation.

### Discovery behavior (verified against the gating logic)

- **New users:** fresh store → `pickerSeen: false`, `initialHasSeen.addExercise: false` → welcome
  picker opens on `/program` and lists all three tours, the new one as "Start →".
- **Existing users:** `pickerSeen: true` → picker never reopens → they find "Replay: Add your own
  exercises" under Settings → Help. (Matches the chosen "Help-only" behavior.)

## Out of scope (noted, not touched)

- The `today` ("Get to know the app") tour's step 1 targets the Start button, which doesn't render
  in a brand-new user's empty state. Pre-existing; the user confirmed that tour is fine.
- The app's "Create blank program" button label opening a chooser (`/program/new`) rather than the
  builder is an app-UI nuance, not a tour bug; left alone.

## Verification

- `npm run typecheck` (`tsc --noEmit`) clean — note: a stale empty `.next/dev/types/routes.d.ts`
  can produce a false "not a module" error; clear `.next/dev/types` if so.
- `npm run lint` — 0 new errors (2 pre-existing `progression.ts` warnings are expected).
- Production build green.
- Manual (preview, `claude-test@example.com`): replay each tour from Settings → Help; confirm the
  `createProgram` copy reads correctly and the new `addExercise` tour spotlights the "Add exercise"
  button then the media chooser across the `/program/exercises` → `/program/exercises/new`
  navigation. Confirm a fresh-state welcome picker lists three tours.
