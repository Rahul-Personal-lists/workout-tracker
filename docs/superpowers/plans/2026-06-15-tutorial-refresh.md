# Tutorial Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the "Make your first program" tour copy to acknowledge the Program Library, and add a new 2-step "Add your own exercises" tour.

**Architecture:** Both tours live in the existing onboarding system — tour data in `tutorial-overlay.tsx`, persisted flags in the zustand store `tutorial.ts`, surfaced via the welcome picker (`onboarding-picker.tsx`) and the Settings → Help replay list (`settings-replay-tutorials.tsx`). The new tour follows the exact pattern of the two existing tours: a `TourId`, a `TOUR_STEPS` entry, a step count, picker + replay entries, and `data-tour` anchors on its targets. No store version bump — the new flag degrades to falsy for existing users (Help-only discovery).

**Tech Stack:** Next.js 16 (App Router, TypeScript strict), zustand + persist, Tailwind v4.

**Verification model:** This is UI copy + tour-config wiring. The repo verifies UI via `tsc` (which enforces the exhaustive `Record<TourId, …>` maps), `npm run lint`, a production build, and manual preview — not component unit tests. There is no meaningful pure unit to TDD here, so each task's gate is a green `tsc` plus a commit, with a manual preview pass at the end (matching how the custom-exercise and library features were verified per `.claude/sessions.md`).

**Important coupling:** `TUTORIAL_STEP_COUNT[tour]` is maintained by hand and MUST equal `TOUR_STEPS[tour].length`. The new tour has 2 steps → `addExercise: 2`.

---

### Task 1: Refresh `createProgram` tour copy

**Files:**
- Modify: `src/components/tutorial-overlay.tsx` (the `createProgram` array in `TOUR_STEPS`, ~lines 59–102)

- [ ] **Step 1: Update step 1 (template) body to mention the library**

In `src/components/tutorial-overlay.tsx`, replace the first `createProgram` step's `body`:

```tsx
// FROM:
      body: "Fastest start — tap 'Use this program' on any ready-made plan and you'll be training today. No setup needed.",
// TO:
      body: "Fastest start — tap 'Use this program' on one of these and you're training today. These are just quick picks; the full library (below) has the whole catalog — grouped by days per week, filterable by gym and experience.",
```

- [ ] **Step 2: Fix step 2 (build-your-own) body framing**

Replace the second `createProgram` step's `body`:

```tsx
// FROM:
      body: "Want full control? Tap here to build from a blank program — we'll walk you through it.",
// TO:
      body: "Want full control? Tap 'Create blank program' to start from scratch — we'll walk you through it next.",
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: clean (no errors). If you see `routes.d.ts is not a module`, delete the stale `.next/dev/types` dir and re-run — it's a dev artifact, not a source error.

- [ ] **Step 4: Commit**

```bash
git add src/components/tutorial-overlay.tsx
git commit -m "Tutorial: createProgram copy points at the program library"
```

---

### Task 2: Add and wire the `addExercise` tour

This task widens `TourId`, which breaks every exhaustive `Record<TourId, …>` until all are updated — so all five files land in one green commit. The tour will run after this task but show no spotlight ring until its anchors exist (Task 3); that degrades gracefully to a dim backdrop, it does not crash.

**Files:**
- Modify: `src/lib/stores/tutorial.ts`
- Modify: `src/components/tutorial-overlay.tsx`
- Modify: `src/components/onboarding-picker.tsx`
- Modify: `src/components/onboarding-redirector.tsx`
- Modify: `src/components/settings-replay-tutorials.tsx`

- [ ] **Step 1: Widen `TourId` and step count in the store**

In `src/lib/stores/tutorial.ts`:

```ts
// FROM:
export type TourId = "today" | "createProgram";

export const TUTORIAL_STEP_COUNT: Record<TourId, number> = {
  today: 5,
  createProgram: 7,
};
// TO:
export type TourId = "today" | "createProgram" | "addExercise";

export const TUTORIAL_STEP_COUNT: Record<TourId, number> = {
  today: 5,
  createProgram: 7,
  addExercise: 2,
};
```

- [ ] **Step 2: Add the new key to the three initial records**

In `src/lib/stores/tutorial.ts`:

```ts
// FROM:
const initialHasSeen: Record<TourId, boolean> = {
  today: false,
  createProgram: false,
};
const initialAutoStart: Record<TourId, boolean> = {
  today: false,
  createProgram: false,
};
const initialStep: Record<TourId, number> = {
  today: 0,
  createProgram: 0,
};
// TO:
const initialHasSeen: Record<TourId, boolean> = {
  today: false,
  createProgram: false,
  addExercise: false,
};
const initialAutoStart: Record<TourId, boolean> = {
  today: false,
  createProgram: false,
  addExercise: false,
};
const initialStep: Record<TourId, number> = {
  today: 0,
  createProgram: 0,
  addExercise: 0,
};
```

- [ ] **Step 3: Make the migrate branches type-safe against the widened union**

In `src/lib/stores/tutorial.ts`, the v<2 branch builds a `hasSeen` literal and the v<3 branch falls back to a possibly-partial object. Both must now include `addExercise`. There is NO version bump (this is type-compatibility only; behavior is unchanged — existing users still discover the new tour via Settings → Help, not the picker).

```ts
// v<2 branch — FROM:
          const hasSeen = {
            today: old.hasSeen ?? false,
            createProgram: false,
          };
// v<2 branch — TO:
          const hasSeen = {
            today: old.hasSeen ?? false,
            createProgram: false,
            addExercise: false,
          };
```

```ts
// v<3 branch — FROM:
          const hasSeen = old.hasSeen ?? initialHasSeen;
// v<3 branch — TO (guarantees all keys, defaulting new ones to false):
          const hasSeen = { ...initialHasSeen, ...old.hasSeen };
```

- [ ] **Step 4: Add the `addExercise` steps to `TOUR_STEPS`**

In `src/components/tutorial-overlay.tsx`, add a third entry to the `TOUR_STEPS` object, after the `createProgram` array's closing `],` and before the object's closing `};`:

```tsx
  addExercise: [
    {
      target: "add-exercise",
      route: "/program/exercises",
      title: "Add your own exercise",
      body: "Missing a move from the library? Tap here to add your own — record a clip, upload a video (a screen recording works great), or snap a photo.",
    },
    {
      target: "custom-media",
      route: "/program/exercises/new",
      title: "Three ways to capture it",
      body: "Record up to 80 seconds with your camera, upload a video you already have, or add a single photo. Pick whatever's easiest.",
    },
  ],
```

- [ ] **Step 5: Wire the new tour into the welcome picker**

In `src/components/onboarding-picker.tsx`:

Add the option to the `OPTIONS` array (after the `createProgram` entry):

```tsx
  {
    tour: "addExercise",
    title: "Add your own exercises",
    caption: "2 steps · record, upload, or photo",
    route: "/program/exercises",
  },
```

Add two selectors alongside the existing `hasSeen`/`autoStart` selectors:

```tsx
// after: const hasSeenCreate = useTutorial((s) => s.hasSeen.createProgram);
  const hasSeenAddExercise = useTutorial((s) => s.hasSeen.addExercise);
// after: const autoStartCreate = useTutorial((s) => s.autoStart.createProgram);
  const autoStartAddExercise = useTutorial((s) => s.autoStart.addExercise);
```

Extend the `open` gate so the picker stays closed while the new tour auto-runs:

```tsx
// FROM:
  const open =
    hydrated &&
    !pickerSeen &&
    pathname === "/program" &&
    !autoStartToday &&
    !autoStartCreate;
// TO:
  const open =
    hydrated &&
    !pickerSeen &&
    pathname === "/program" &&
    !autoStartToday &&
    !autoStartCreate &&
    !autoStartAddExercise;
```

Extend the `completed` record (this is type-required — `Record<TourId, boolean>`):

```tsx
// FROM:
  const completed: Record<TourId, boolean> = {
    today: hasSeenToday,
    createProgram: hasSeenCreate,
  };
// TO:
  const completed: Record<TourId, boolean> = {
    today: hasSeenToday,
    createProgram: hasSeenCreate,
    addExercise: hasSeenAddExercise,
  };
```

- [ ] **Step 6: Include the new tour in the redirector's "all seen" check**

In `src/components/onboarding-redirector.tsx`:

```tsx
// add this selector alongside the others:
  const hasSeenAddExercise = useTutorial((s) => s.hasSeen.addExercise);

// FROM:
    if (!hasSeenToday || !hasSeenCreate) return;
// TO:
    if (!hasSeenToday || !hasSeenCreate || !hasSeenAddExercise) return;

// and add hasSeenAddExercise to the effect's dependency array:
  }, [pickerSeen, hasSeenToday, hasSeenCreate, hasSeenAddExercise, dismissPicker, router]);
```

- [ ] **Step 7: Add the Settings → Help replay entry**

In `src/components/settings-replay-tutorials.tsx`, add to the `ENTRIES` array (after the `createProgram` entry):

```tsx
  {
    tour: "addExercise",
    label: "Replay: Add your own exercises",
    route: "/program/exercises",
  },
```

- [ ] **Step 8: Typecheck**

Run: `npm run typecheck`
Expected: clean. (If anything about `Record<TourId, …>` errors, a map is still missing the `addExercise` key — re-check steps 1, 2, and 5's `completed`.)

- [ ] **Step 9: Commit**

```bash
git add src/lib/stores/tutorial.ts src/components/tutorial-overlay.tsx src/components/onboarding-picker.tsx src/components/onboarding-redirector.tsx src/components/settings-replay-tutorials.tsx
git commit -m "Tutorial: add 'Add your own exercises' tour (picker + Help replay)"
```

---

### Task 3: Add the `data-tour` anchors for the new tour

Without these, the tour runs but shows a dim backdrop instead of a spotlight ring on its targets.

**Files:**
- Modify: `src/app/(app)/program/exercises/page.tsx` (the "Add exercise" `Link`, ~line 41)
- Modify: `src/app/(app)/program/exercises/new/create-custom-exercise-client.tsx` (the media chooser `div`, ~line 297)

- [ ] **Step 1: Anchor the "Add exercise" button**

In `src/app/(app)/program/exercises/page.tsx`, add `data-tour="add-exercise"` to the "Add exercise" link:

```tsx
// FROM:
        <Link
          href="/program/exercises/new"
          aria-label="Add custom exercise"
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent text-accent-foreground font-medium px-3.5 h-9 text-sm ${FOCUS_RING}`}
        >
// TO:
        <Link
          href="/program/exercises/new"
          data-tour="add-exercise"
          aria-label="Add custom exercise"
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent text-accent-foreground font-medium px-3.5 h-9 text-sm ${FOCUS_RING}`}
        >
```

- [ ] **Step 2: Anchor the media chooser**

In `src/app/(app)/program/exercises/new/create-custom-exercise-client.tsx`, add `data-tour="custom-media"` to the chooser container (the `else` branch wrapping the Add photo / Record / Upload buttons):

```tsx
// FROM:
          <div className="grid gap-2">
// TO:
          <div data-tour="custom-media" className="grid gap-2">
```

Note: this `div` is the chooser's initial state (shown when no media is selected). The tour lands here on a fresh navigation, so the anchor is present.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/program/exercises/page.tsx" "src/app/(app)/program/exercises/new/create-custom-exercise-client.tsx"
git commit -m "Tutorial: add-exercise + custom-media tour anchors"
```

---

### Task 4: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Typecheck, lint, build**

Run: `npm run typecheck`
Expected: clean.

Run: `npm run lint`
Expected: 0 errors (2 pre-existing `progression.ts` warnings are expected and unrelated).

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 2: Manual preview (preview browser, `claude-test@example.com`)**

Authenticate per CLAUDE.md ("Previewing auth-gated pages"), then verify:

- Settings → Help shows **three** replay buttons, including "Replay: Add your own exercises".
- Replay "Make your first program": step 1 copy reads the new template/library text; step 2 reads "Tap 'Create blank program' to start from scratch…".
- Replay "Add your own exercises": step 1 spotlights the "Add exercise" button on `/program/exercises`; tapping Next navigates to `/program/exercises/new` and step 2 spotlights the media chooser (Add photo / Record / Upload). "Done" closes the tour with no console errors.
- Fresh state (clear the `tutorial` localStorage key, reload `/program`): the welcome picker lists all three tours.

- [ ] **Step 3: Final commit if anything changed during verification**

```bash
git status   # if clean, nothing to do
```

---

## Notes / out of scope

- The `today` tour's step-1 target (`today-cta`) doesn't render in a brand-new user's empty state — pre-existing, confirmed out of scope.
- The app's "Create blank program" button opening a chooser (`/program/new`) rather than the builder is an app-UI nuance, not a tour bug — left alone.
- No store `version` bump: existing persisted state lacks `addExercise` in `hasSeen` → reads falsy (correct "not seen"); `autoStart`/`step` are runtime-only and re-initialize with the new key.
