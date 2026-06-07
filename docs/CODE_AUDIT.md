# Trainr — Code Audit & Improvement Plan

> **📓 Historical record (2026-05-29).** This was the first whole-repo audit; its fixes shipped in PR #77 and several then-deferred items (rest-skip flag, modal a11y, `requireUser` sweep, perf tier) have since shipped too. It has been **superseded by [`REFACTOR_PLAN.md`](./REFACTOR_PLAN.md)** (2026-06-06), the current live backlog. Kept for provenance; do not pick work from here — use REFACTOR_PLAN.

Repo-wide scan (2026-05-29) across all 12 subsystems, cross-verified against the source. Findings are grouped by theme and prioritized. Each is tagged:

- ✅ **Fixed** in the accompanying refactor pass
- 📋 **Recommended** — deferred (larger, riskier, or a judgment call); not applied
- 📝 **Documented** — captured in [`ARCHITECTURE.md`](./ARCHITECTURE.md) / docs, no code change

Severity: **High** = correctness/data-loss/user-visible-wrong; **Medium** = real but bounded; **Low** = polish/consistency.

Baseline before changes: `tsc --noEmit` clean; `eslint` was **already failing** — **11 errors** total from React 19's new compiler rules (`react-hooks/set-state-in-effect`, `react-hooks/immutability`) plus 4 unused-var warnings. (Lint was red on `main`; none of these were introduced here.) After this pass: `eslint` exits **0** (2 pre-existing `_`-prefixed unused-param warnings in `progression.ts` remain, non-failing).

---

## Correctness bugs

| # | Sev | File | Issue | Status |
|---|---|---|---|---|
| B1 | High | `lib/queries.ts` `getTodayWeightLb` | Builds "today" from **server-local** `new Date()` instead of `dateKeyInTz(getUserTimezone())` like every other date path. On a UTC server, a Vancouver user sees the wrong day's weight from late afternoon on. | ✅ Fixed |
| B2 | High | `actions/workout.ts` `editSetLog` | Rewrites `logged_at = now()` on every edit. `getExerciseHistory` orders by `logged_at`, so editing an old set teleports that point to "now" and corrupts the progress chart's chronology + latest/delta. | ✅ Fixed (omit `logged_at` on edit; shared upsert helper) |
| B7 | High | `emails/weekly-summary.tsx` | Both email CTA buttons (`sent` + `missed` variants) link to **`/today`**, a deleted route. Every weekly email's primary CTA 404s / hits the auth gate. | ✅ Fixed (→ `/program`) |
| B4 | Med | `lib/body-stats.ts` | `windowSeries` (31/92/184/366, strict `>`) and `padToWindow` (30/90/180/365, `>=`) disagree, so a point exactly at the window boundary survives the filter but has no axis slot → silently dropped from the chart. | ✅ Fixed (shared `WINDOW_DAYS` + same boundary) |
| B5 | Med | `history/exercise/[id]/page.tsx` | Per-session "top" point ignores reps as a tie-break (unlike `getAllTimeTopByExercise` and the session-detail reduce). For equal weight, the wrong (lower-rep) set's reps can show. | ✅ Fixed (weight-then-reps comparator) |
| B6 | Med | `actions/program.ts` `archiveProgram` | Lacks the in-progress-session guard that `setActiveProgram` has. Archiving the active program mid-session promotes "the other" program — the exact switch `setActiveProgram` forbids. | ✅ Fixed (same guard) |
| B3 | Med | `body/body-client.tsx` | `previewUrls = useMemo(() => pickedPhotos.map(URL.createObjectURL))` never revokes — leaks object URLs + File blobs for the page's lifetime. | ✅ Fixed (revoke effect) |
| B8 | Med | `lib/queries.ts` `getUndoableSkip` / `actions/workout.ts` `undoLastSkip` | Rest-day skips are identified solely by `duration_seconds = 0`. A real workout finished within one second (or where paused ≥ elapsed) also yields 0 → could surface a bogus "undo skip" banner that **deletes a real session**. | 📋 Recommended (proper fix needs an `is_rest_skip` column → migration; or a code-only "require zero set_logs" guard) |
| B9 | Med | `components/tutorial-overlay.tsx` | The "click-catcher" backdrop has no handler and default `pointer-events`, so taps fall through to the app mid-tour (e.g. a nav tab) and desync the "modal" tour. | 📋 Recommended (onboarding-only path) |

---

## Dead code

| # | Sev | Target | Status |
|---|---|---|---|
| D1 | Med | **`revalidatePath("/today")`** — ~22 calls across `actions/workout.ts` + `actions/program.ts` for a deleted route. `startWorkout` revalidates *only* `/today` (so `/program` never refreshes after start). | ✅ Fixed (removed; `startWorkout` → `/program`) |
| D2 | Med | `queries.ts` `getDisplayName()` — no callers (name comes from `getProfile()`). | ✅ Removed |
| D3 | Low | `queries.ts` `SessionSummary` type — orphaned and doesn't match `getSession`'s actual return. | ✅ Removed |
| D4 | Med | `actions/program.ts` `renameProgram` + `renameDay` (+ schemas) — no callers. | ✅ Removed |
| D5 | Med | `settings/display-name-field.tsx` + `actions/profile.ts` `setDisplayName` — component never imported; action only used by it. | ✅ Removed |
| D6 | Med | `settings/sign-out.tsx` `SignOutButton` — never imported (profile-client has its own inline sign-out). | ✅ Removed |
| D7 | Med | `lib/units.ts` `getUnitsFromCookie`, `getSoundPrefsFromCookie`, `serializeSoundPrefs`, `SoundPrefs`, `UNITS_COOKIE`/`SOUND_PREFS_COOKIE` — all unused; cookies are write-only. | ✅ Removed (kept `Units` + `isUnits`) |
| D8 | Med | `body/body-client.tsx` — `deleteBodyLog` imported but never called. | ✅ Removed (import) |
| D9 | Low | `actions/profile.ts` — `void isUnits;` keep-alive + unused `isUnits` import. | ✅ Removed |
| D10 | Low | `lib/progression.ts` `getPhase`/`Phase` — unused by app code; 4/8-week boundaries don't generalize. | 📋 Recommended (lives in load-bearing math file; leave for a flagged pass) |
| D11 | Low | `queries.ts` `getExerciseHistory` returns `target_seconds` — never consumed. | 📋 Recommended |
| D12 | Low | `queries.ts` `ProgressBucket.minutes`/`.sessionId` computed but the chart drops them. | 📋 Recommended |

---

## Simplification / consistency

| # | Sev | File | Issue | Status |
|---|---|---|---|---|
| S1 | Low | `actions/workout.ts` | `logSet` and `editSetLog` are byte-identical except revalidation. | ✅ Fixed (shared `upsertSetLog` helper; folds in B2) |
| S2 | Low | `actions/program.ts` | Two-phase `order_index` renumber duplicated in `setExerciseOrder` + `saveDayEdits`. | ✅ Fixed (shared `renumberExercises` helper) |
| S3 | Med | `progress/progress-bar-chart.tsx` | Hardcoded hex incl. the **lime accent** (`rgba(163,230,53,…)`) for the tooltip cursor — breaks under the other 4 themes (CLAUDE.md: don't hardcode accent). | ✅ Fixed (CSS vars) |
| S4 | Low | `program/program-switcher.tsx` | Trigger label hardcoded `"My Plan"`; the computed `active` program is unused (lint warning). | ✅ Fixed (shows active program name) |
| S5 | Low | `lib/format.ts` | `let inches` never reassigned. | ✅ Fixed (`const`) |
| S6 | Med | `lib/units` / `actions/profile.ts` `setSoundPrefs` | Sound-prefs serialization format duplicated (now that D7 removed the shared fn, the writer is the sole source). | 📝 Documented (writer is now canonical) |
| S7 | Low | `lib/body-metrics.ts` | `LB_PER_KG`, `2.54`, one-decimal formatter duplicated from `format.ts`. | 📋 Recommended |
| S8 | Low | `settings/units/page.tsx` | Reads units from the **cookie** while every other screen reads from the DB (`getProfile`) — can diverge. | 📋 Recommended |
| S9 | Low | `actions/workout.ts` + `program.ts` | Several mutations use bare `createClient()` instead of `requireUser()`; an expired session is a silent no-op instead of a clean error. RLS still backstops. | 📋 Recommended (defense-in-depth, low urgency) |

---

## Lint errors (React 19 compiler rules)

Lint was red on `main` with 11 errors. Three were fixed structurally; the other eight are accepted patterns the new rules over-flag (hydration gates, layout-effect DOM measurement, event-handler DOM writes) and are now cleared with scoped, justified `eslint-disable` directives. Result: `eslint` exits 0.

**Fixed structurally:**

| # | File | Fix | Status |
|---|---|---|---|
| L1 | `settings/theme-picker.tsx` | Read the `accent-theme` cookie **server-side** in `theme/page.tsx` and pass `initialTheme` — removes the post-mount `setState` effect entirely. | ✅ Fixed |
| L2 | `program/skip-undo-banner.tsx` | `expired` is already lazy-initialized; the `setExpired(true)` in the effect was redundant → dropped. | ✅ Fixed |
| L3 | `program/new/blank-program-form.tsx` | A genuine post-mount `sessionStorage` read (hydration-safe by design). Scoped `eslint-disable` with the existing why-comment. | ✅ Fixed |

**Pre-existing, suppressed with justification** (valid patterns flagged by the new rules):

| # | File | Pattern | Status |
|---|---|---|---|
| L4 | `settings/theme-picker.tsx` | `react-hooks/immutability` on `document.cookie` / `dataset.theme` writes inside an **onClick handler** — legitimate. | ✅ Suppressed |
| L5 | `(auth)/login/page.tsx` | Client-only hydration gate (`setMounted`) + one-time `?error` read. | ✅ Suppressed |
| L6 | `onboarding-picker.tsx`, `tutorial-overlay.tsx` (×1 each) | Zustand-persist hydration gate (`setHydrated(hasHydrated())`); lazy init would SSR-mismatch. | ✅ Suppressed |
| L7 | `tutorial-overlay.tsx` (×2) | `useLayoutEffect` measuring viewport/rect from the DOM then setting state. | ✅ Suppressed |
| L8 | `workout/[sessionId]/time-set-input-row.tsx` | Timer-expiry auto-complete (behaviour-correct; structural cleanup is P5). | ✅ Suppressed |

> 2 `progression.ts` warnings (`_weekNumber`/`_deloadWeeks` unused params in the `getPlannedSeconds` passthrough) remain — non-failing; left untouched since they're in the load-bearing math file.

---

## Accessibility

The `/today` audit baseline is solid (focus rings via `--focus-ring-*`, skip link, `aria-current`, pinch-zoom preserved). The gaps are in modals and unmigrated screens:

| # | Sev | Area | Status |
|---|---|---|---|
| A1 | Med | **Modal dialogs lack focus trap / Escape / focus-return / `role=dialog`**: workout image-zoom, finish-sheet + photo-picker, body photo lightbox + camera, session-photos lightbox. (`DayNotePopover` already does it right — use as the pattern.) | 📋 Recommended |
| A2 | Med | Set-row buttons, photo thumbnails, exercise-detail links missing `:focus-visible` ring (app-wide baseline). | 📋 Recommended |
| A3 | Low | Login email/OTP inputs and profile Name/Age/Height inputs have no programmatic `<label>`/`aria-label`. | 📋 Recommended |
| A4 | Low | Photo `<img alt="">` inside buttons → unlabeled controls for screen readers. | 📋 Recommended |
| A5 | Low | `swipe-row` action is keyboard-reachable only after a pointer swipe. | 📋 Recommended |
| A6 | Low | Validation errors render as plain `<p>` with no `role="alert"`/`aria-live`. | 📋 Recommended |

---

## Performance

| # | Sev | File | Issue | Status |
|---|---|---|---|---|
| P1 | Low | `queries.ts` `getLastSessionHints`, `getAllTimeTopByExercise` | Pull the full completed-set history then reduce in JS. Fine for one user; scales linearly. | 📋 Recommended (DB-side aggregate if history grows) |
| P2 | Low | `workout-client.tsx` | 1s elapsed-clock re-renders the whole exercise tree. | 📋 Recommended (isolate an `<ElapsedClock>`) |
| P3 | Low | `time-set-input-row.tsx` | Auto-complete effect re-subscribes every render (fresh `onChange` closure). | 📋 Recommended |
| P4 | Low | `program/add/add-exercise-client.tsx` | Re-fetches/parses the full catalog JSON on every mount. | 📋 Recommended (module-level cache) |
| P5 | Med | `time-set-input-row.tsx` | Per-set countdown lives in local state — lost on navigation/unmount; auto-complete + log never fire. | 📋 Recommended (persist like the rest timer) |

---

## Security (single-user scope — all low/hardening)

| # | Sev | File | Issue | Status |
|---|---|---|---|---|
| SEC1 | Low | `api/cron/weekly-summary/route.ts` | `CRON_SECRET` compared with non-constant-time `!==`. | ✅ Fixed (length guard + `timingSafeEqual`) |
| SEC2 | Low | `api/auth/callback/route.ts` | `next` param redirect not allowlisted (assigned to `.pathname`, so origin is safe, but no `/`-prefix / `//` guard). | ✅ Fixed (validate single-leading-slash) |
| SEC3 | Low | `(auth)/login/page.tsx` | `signInWithOtp` defaults `shouldCreateUser: true` — any email can self-provision. | 📋 Recommended (set `shouldCreateUser:false` or document open signup) |
| SEC4 | Low | `lib/photo-upload.ts` | `isLikelyImage` trusts client-supplied type/extension (no magic-byte check). | 📋 Recommended (accepted risk for single-user) |

---

## Documentation drift (real: files referenced don't exist)

| # | Where | Drift | Status |
|---|---|---|---|
| DOC1 | `CLAUDE.md`, `README.md` | Reference `src/middleware.ts` as the auth gate — it's **`src/proxy.ts`** (Next 16 rename). | ✅ Fixed |
| DOC2 | `CLAUDE.md` Routes, `README.md` | Reference `/today` (deleted) and `/calendar` (it's `/progress`); nav listed as "Program/Calendar/Body/Settings" (actually Program/**Progress**/Body/Settings). | ✅ Fixed |
| DOC3 | `CLAUDE.md` | "(app) layout also redirects, defense-in-depth" — it does **not**; proxy is the only gate. | ✅ Fixed (corrected) |
| DOC4 | `CLAUDE.md` | Migration list stops at `20260428`; misses 6 later migrations. | ✅ Fixed |
| DOC5 | `CLAUDE.md` | "Deferred dead code" note lists `reorderDay` as unused — it's now wired (`DayMoveButtons`); `rename*` were the dead ones (now removed). | ✅ Fixed |
| DOC6 | `README.md` | Whole file stale (`/today`, "Phase 2/3 pending", middleware). | ✅ Rewritten |

---

## Migrations hygiene

| # | Sev | Issue | Status |
|---|---|---|---|
| M1 | Med | `20260501030916_swap_day_order.sql` + `20260501031002_swap_day_order.sql` are **empty `;` no-ops** (real fn is in `20260430`). | 📝 Documented (don't delete already-applied migrations — would desync history) |
| M2 | Med | `20260529000000_body_measurements.sql` and `20260529000000_settings_extras.sql` **share a timestamp** → undefined apply order on a fresh env. | 📝 Documented (rename only before next fresh deploy) |
| M3 | Med | `.github/workflows/refresh-exercise-catalog.yml` runs `--force`, disarming the script's risky-change guard (a `primary[]` change silently shifts weekly-email muscle math). | 📋 Recommended (drop `--force` in CI) |

---

## Misc

| # | Sev | Issue | Status |
|---|---|---|---|
| X1 | Low | `manifest.ts` references `/screenshot-narrow.png`, which isn't in the repo → 404 in the manifest. | 📝 Documented (harmless; add the asset or drop the entry) |
| X2 | Low | `body/body-photos.tsx` delete uses `window.confirm` instead of the app's 2-tap confirm pattern. | 📋 Recommended |
| X3 | Med | `body-client.tsx` `logs`/`measurements` live in `useState` seeded once, but `photos` are prop-driven + `router.refresh()` — the two halves can diverge (a second device's edits won't show for logs). | 📋 Recommended (pick one source of truth) |
| X4 | Low | `scripts/*` duplicate an inlined `loadEnv()`; `test-otp.ts` omits the try/catch + `main().catch`. | 📋 Recommended |
| X5 | Low | `progress`/`history`/`workout`/`body`/`login` still use raw `text-neutral-*` / `bg-neutral-*` instead of semantic tokens (per-screen migration debt). | 📋 Recommended |

---

### Summary

Applied this pass: **7 correctness bugs**, **9 dead-code removals**, **5 simplifications**, **2 security hardenings**, and the **lint cleanup** (3 errors fixed structurally + 8 pre-existing valid-pattern errors suppressed → `eslint` red‑to‑green), plus the documentation set ([`ARCHITECTURE.md`](./ARCHITECTURE.md) with 7 diagrams, this audit, a rewritten [`README.md`](../README.md), and CLAUDE.md drift corrections). Verified: `tsc --noEmit` clean and `eslint` exits **0**.

The deferred items are either larger refactors (a11y modals, per-screen token migration, the body-client state-model cleanup), need a schema migration (B8), or touch load-bearing progression math that requires Rahul's sign-off (D10, peak-taper weeks). None of the deferred items are correctness-critical for the single-user app today.
