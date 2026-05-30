# Trainly — Deferred backlog

Action list for items found in the 2026-05-29 audit but **not** applied in PR #77 (they need a schema migration, are larger refactors, or are judgment calls). IDs cross-reference [`CODE_AUDIT.md`](./CODE_AUDIT.md). Each entry is sized to be picked up independently.

Convention reminders before touching anything: reads → `lib/queries.ts`, writes → Zod-validated `actions/*.ts`; RLS is the only tenant boundary; **don't** change progression math or `set_logs.planned_*` snapshotting without flagging; after a migration run `npx supabase db push && npm run db:types`. Verify every change with `npm run typecheck` + `npm run lint` (both currently green).

---

## Tier 1 — real bugs / data-loss (do next)

### B8 · Rest-day skip sentinel can delete a real workout  ⚠️ needs migration
- **Where:** `lib/queries.ts` `getUndoableSkip`; `actions/workout.ts` `undoLastSkip` (+ `skipRestDay`), and the `duration_seconds.gt.0` filters in `getWeekStreak` / `getLatestSessionDateKey` / `getSessionsByDateForMonth` / `getProgressForRange`.
- **Problem:** a rest-day skip is identified only by `duration_seconds = 0`. A genuine workout finished within one clock second (or where paused ≥ elapsed) also yields 0 → it can surface as an "undo skip" banner and be **deleted** within the 5-min window.
- **Fix:** add a boolean column, set it in `skipRestDay`, and key all skip detection + the activity filters off it instead of the overloaded duration.
  - Migration: `alter table workout_sessions add column is_rest_skip boolean not null default false;` then `npm run db:types`.
  - `skipRestDay` insert sets `is_rest_skip: true`.
  - `getUndoableSkip` / `undoLastSkip`: filter `.eq("is_rest_skip", true)` instead of `.eq("duration_seconds", 0)`.
  - Activity filters: replace `or("duration_seconds.is.null,duration_seconds.gt.0")` with `.eq("is_rest_skip", false)`.
  - **Stop-gap if avoiding a migration:** require zero `set_logs` for the candidate session before treating it as a skip (a true skip never logs sets).
- **Done when:** a zero-duration *logged* session never appears in the undo banner and is never deleted by Undo.

### B9 · Tutorial overlay isn't actually modal
- **Where:** `components/tutorial-overlay.tsx` (~lines 382–396).
- **Problem:** the `inset-0` "click-catcher" has no handler and default `pointer-events`, so taps pass through to the app mid-tour (e.g. a nav tab) and desync the tour, despite `role=dialog`/`aria-modal`.
- **Fix:** give the catcher `pointer-events:auto` + an `onPointerDown`/`onClick` that `preventDefault()`+`stopPropagation()`s (or advances the tour deliberately); keep the card above it.
- **Done when:** tapping outside the card during a tour doesn't navigate the app.

---

## Tier 2 — solid improvements (no schema change)

### A1 · Modal dialogs: focus trap + Escape + focus return
- **Where:** workout image-zoom (`workout/[sessionId]/exercise-card.tsx`), finish sheet + photo picker (`finish-sheet.tsx`), body photo lightbox (`body/body-photos.tsx`) + camera (`photo-capture.tsx`), session-photos lightbox (`history/[sessionId]/session-photos.tsx`).
- **Fix:** add `role="dialog"` + `aria-modal` + `aria-label`, move focus in on open, trap Tab, close on Escape, restore focus on close. **`components/day-note-popover.tsx` already implements this** — mirror it (consider extracting a small `useDialog`/`<Modal>` helper since there are 5 sites).
- **Done when:** each modal is keyboard-dismissable and traps focus.

### X3 · body-client state/prop divergence
- **Where:** `body/body-client.tsx` — `logs`/`measurements` are `useState` seeded once from props; `photos`/`goal`/`units` are prop-driven + `router.refresh()`.
- **Fix:** pick one source of truth. Simplest: drop the `useState` mirrors and derive from props (rely on `revalidatePath("/body")` + `router.refresh()`), or keep optimistic state and drop the `router.refresh()` calls. Don't run both.
- **Done when:** a server-side change (or second device) reflects in logs/measurements without a hard reload.

### S8 · `/settings/units` reads cookie, not DB
- **Where:** `settings/units/page.tsx` uses `getUnitsServer()` (cookie) while the hub + every other screen read `profile.units` via `getProfile()`.
- **Fix:** read units from `getProfile()` here too, for one source of truth.

### S9 · Standardize `requireUser()` across mutations
- **Where:** `actions/workout.ts` (`logSet`, `editSetLog`, `deleteSetLog`, `editSessionDuration`, `finishWorkout`, `deleteSessionPhoto`, `deleteSession`) and several in `actions/program.ts` use bare `createClient()`.
- **Fix:** call `requireUser()` at the top so an expired session fails loudly instead of silently no-op'ing. RLS still backstops; this is defense-in-depth + consistency.

---

## Tier 3 — performance (all acceptable for single-user today)

- **P5 · Per-set countdown lost on navigation** — `workout/[sessionId]/time-set-input-row.tsx`. The time-attack countdown lives in local state; navigating away loses it and the auto-complete/log never fires. Persist it (store `endsAt` keyed by set, like the rest-timer store) or recompute from a stored end timestamp.
- **P2 · Elapsed clock re-renders the whole tree** — `workout-client.tsx`. Extract a tiny `<ElapsedClock startedAt=… />` that owns its own 1s interval so the set list stays stable.
- **P1 · Unbounded history scans** — `queries.ts` `getLastSessionHints` / `getAllTimeTopByExercise` pull all completed set_logs then reduce in JS. Push to a SQL aggregate/RPC if history grows.
- **P3 · time-set effect churn** — stabilize the per-set `onChange` (useCallback / ref) so the expiry effect stops re-subscribing each render.
- **P4 · catalog re-fetch** — `program/add/add-exercise-client.tsx` re-fetches/parses `exercises-catalog.json` on every mount; cache it module-level.

---

## Tier 4 — polish / hygiene

### A11y (rest of the baseline)
- **A2** focus-visible rings on set-row buttons (`set-editor.tsx`), photo thumbnails (`session-photos.tsx`), exercise-detail links — match `RedoSessionButton` and reference `--focus-ring-*`.
- **A3** `aria-label`/`<label>` on login email/OTP inputs and profile Name/Age/Height inputs.
- **A4** meaningful `alt`/`aria-label` on photo `<img>` inside buttons (currently `alt=""`).
- **A5** `swipe-row.tsx` action is reachable only after a pointer swipe — add a non-pointer affordance.
- **A6** wrap validation-error `<p>` in `role="alert"`/`aria-live`; set `aria-invalid`/`aria-describedby` on the field.

### Tokens / consistency
- **X5** per-screen semantic-token migration: `/workout/*` (header, exercise-card, finish-sheet, photo-thumb), `/history/*`, `/body`, `/login` still use raw `text-neutral-*` / `bg-neutral-*` / `border-neutral-*`. Migrate per-screen to `text-foreground-muted` / `bg-surface` / `border-border`.
- **S7** `lib/body-metrics.ts` re-declares `LB_PER_KG` (2.20462), the `2.54` cm/in factor, and a one-decimal formatter — export `LB_PER_KG`/`CM_PER_IN`/a shared formatter from `format.ts` and import them.
- **X2** `body/body-photos.tsx` delete uses `window.confirm` — switch to the app's 2-tap-within-4s confirm pattern.

### Migrations / CI
- **M1** two empty no-op migrations (`20260501030916`, `20260501031002` swap_day_order). **Don't delete** already-applied files (desyncs history) — leave a one-line comment noting they're intentional placeholders.
- **M2** `20260529000000_body_measurements.sql` and `..._settings_extras.sql` share a timestamp → undefined order on a fresh env. Rename one to a later timestamp **before** the next fresh deploy.
- **M3** `.github/workflows/refresh-exercise-catalog.yml` runs `--force`, disarming the script's risky-change guard (a `primary[]` change silently shifts the weekly-email muscle math). Drop `--force` in CI so risky diffs need review.

### Misc / dead code
- **X1** `manifest.ts` references `/screenshot-narrow.png` which isn't in the repo (404) — add the asset or drop the `screenshots` entry.
- **SEC3** `(auth)/login/page.tsx` `signInWithOtp` defaults `shouldCreateUser: true` (any email can self-provision) — set `false` or document open signup in CLAUDE.md.
- **SEC4** `lib/photo-upload.ts` `isLikelyImage` trusts client-supplied type/extension (no magic-byte check) — accepted risk for single-user; revisit if multi-user.
- **D10** `lib/progression.ts` `getPhase`/`Phase` unused; boundaries hardcoded to 12 weeks. Remove or generalize — **flag before touching this file** (load-bearing math).
- **D11** `queries.ts` `getExerciseHistory` returns `target_seconds` that no consumer reads — drop from select/return.
- **D12** `queries.ts` `ProgressBucket.minutes`/`.sessionId` computed but the chart drops them — wire into the chart (link bars to the session / show minutes) or remove the bookkeeping.
- **X4** `scripts/*` duplicate an inlined `loadEnv()`; `test-otp.ts` omits the try/catch + `main().catch`. Extract `scripts/load-env.ts`.

### Progression (needs Rahul's sign-off — explicit weekly expectations)
- **peak_taper week generalization** — `progression.ts` `getPlannedReps` hardcodes the taper to weeks 7/9/10/11 (12-week assumption) while the weight taper is week-relative. Either make it relative to program length / the final deload block, or gate `peak_taper` to the 12-week preset only. Confirm intended behavior before changing.
