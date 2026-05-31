# Trainr — Deferred backlog

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

### S9 · ✅ shipped (branch `fix/s9-require-user`)
- 13 mutating actions in `actions/workout.ts` + `actions/program.ts` now use `requireUser()` — an expired session fails loudly ("Not authenticated") instead of a silent RLS no-op. **Exception:** `logSet` stays on the bare client (fires every set during a workout; the proxy already validates the session on the POST, so the extra Auth round-trip would only add latency on a flaky connection — and its caller swallows errors, so there's no user-facing benefit). RLS still backstops everywhere.

---

## Tier 3 — ✅ P2/P3/P4/P5 shipped (branch `fix/tier3-perf`)

- **P5 — per-set countdown persistence.** The time-attack countdown now lives in a persisted Zustand store (`lib/stores/time-set-timer.ts`, one timer at a time) keyed by `${sessionId}:${exerciseId}:${setNumber}`. It survives navigation/unmount: the owning row resumes it on remount, or completes the set if it expired while away (so the log isn't lost). The key is **session-scoped** so a timer left running can't auto-complete a set in a later session that reuses the same program exercise (caught in review); hydration-gated to avoid an SSR mismatch.
- **P2 — elapsed clock isolated.** `workout-client.tsx` renders a tiny `<ElapsedClock>` that owns its own 1s interval, so the set list no longer re-renders every second.
- **P3 — time-set onChange stabilized.** The expiry effect reads `onChange` via a ref, so a fresh inline `onChange` each render no longer re-subscribes it (compounds with P2).
- **P4 — catalog cached.** `add-exercise-client.tsx` loads `exercises-catalog.json` once per session via a module-level cache instead of on every mount.

### P1 · Unbounded history scans (still open — needs an RPC migration)
- **Where:** `queries.ts` `getLastSessionHints` / `getAllTimeTopByExercise` pull all completed `set_logs` then reduce in JS.
- **Why deferred:** the clean fix is a DB-side aggregate (Postgres RPC), which needs a migration applied to the live project — out of scope for a code-only PR (and acceptable for a single user today). A date floor would help `getLastSessionHints` but could drop the hint for a rarely-trained exercise, and `getAllTimeTopByExercise` is all-time so a floor would be wrong. Revisit if history grows.

---

## Tier 4 — polish / hygiene

### A11y baseline — ✅ A2–A6 shipped (branch `fix/tier4-a11y`)
- **A2** — `:focus-visible` rings (canonical `--focus-ring-*` outline) added to every previously-bare interactive element across history / body / settings / login / workout finish-sheet & set rows / photo controls; `day-note-popover` switched off its hardcoded ring.
- **A3** — `aria-label`s on the login email + OTP inputs, profile Name/Age/Height, goal-weight, metric quick-add, set-row weight/reps, and finish-sheet notes/file inputs.
- **A4** — meaningful `alt` on the session + body photo thumbnails and lightbox/PhotoFrame images (decorative previews kept `alt=""`).
- **A5** — `swipe-row` action is now keyboard-reachable: always focusable, reveal-on-focus (slides open), `opacity-0` when closed so it doesn't bleed through translucent rows, collapse on blur. (Trade-off: adds a tab stop per row.)
- **A6** — validation/save errors announce via `role="alert"`; the `alert()` calls in set-editor + duration-editor were replaced with state-driven regions; delete-session got an `aria-live` confirm announcement.

> Remaining `alert()` error-feedback in `/program` (`day-move-buttons`, `day-tabs`, `edit-client`, `program-switcher`) was out of this batch's mapped scope — small follow-up if desired.

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
