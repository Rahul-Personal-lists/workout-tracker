# Trainly — Deferred backlog

Action list for items found in the 2026-05-29 audit but **not** applied in PR #77 (they need a schema migration, are larger refactors, or are judgment calls). IDs cross-reference [`CODE_AUDIT.md`](./CODE_AUDIT.md). Each entry is sized to be picked up independently.

Convention reminders before touching anything: reads → `lib/queries.ts`, writes → Zod-validated `actions/*.ts`; RLS is the only tenant boundary; **don't** change progression math or `set_logs.planned_*` snapshotting without flagging; after a migration run `npx supabase db push && npm run db:types`. Verify every change with `npm run typecheck` + `npm run lint` (both currently green).

---

## Tier 1 — ✅ shipped (branch `fix/rest-skip-sentinel-and-tutorial-modal`)

- **B8 — explicit rest-skip flag.** Added `is_rest_skip` to `workout_sessions` (migration `20260530000000_rest_skip_flag.sql`, with an idempotent backfill of historical skips). `skipRestDay` sets it; `getUndoableSkip`/`undoLastSkip` and the activity filters in `getWeekStreak`/`getLatestSessionDateKey`/`getSessionsByDateForMonth`/`getProgressForRange` now key off it instead of `duration_seconds = 0`. Undo can no longer delete a real zero-duration workout. **⚠️ Deploy step:** apply the migration (`npx supabase db push`) **before** deploying the code, then `npm run db:types` (it will reproduce the bridged type in `database.types.ts`).
- **B9 — modal tutorial overlay.** The click-catcher now swallows background taps (`onPointerDown`/`onClick` preventDefault+stopPropagation) so the bottom nav etc. can't be hit mid-tour. (Escape + arrow-key nav + `role=dialog` already existed.)

---

## Tier 2 — ✅ A1/X3/S8 shipped (branch `fix/tier2-a11y-modals-and-state`)

- **A1 — modal a11y.** New reusable `lib/use-dialog.ts` hook (initial focus + Tab trap + Escape + focus-return, with a stack so nested sheets only act on the top-most) applied to all 5 modals: workout image-zoom, finish sheet + photo picker, body photo lightbox, camera, session-photos lightbox. Each is now `role="dialog" aria-modal` with a label.
- **X3 — single source of truth.** `body/body-client.tsx` `logs`/`measurements` are now prop-derived (server-authoritative); the optimistic `useState` mirrors that diverged after `router.refresh()` were removed. Mutations still revalidate `/body` + `router.refresh()`.
- **S8 — units from DB.** `settings/units/page.tsx` now reads `getProfile().units` like every other screen, not the cookie.

### S9 · Standardize `requireUser()` across mutations (still open)
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
