# Workout Tracker — Refactor Plan

> Whole-codebase audit (2026-06-06). 11 finders across all 169 source files (9 subsystem slices + repo-wide duplication + reconciliation of the 2026-05-29 `CODE_AUDIT.md`), every finding adversarially re-verified against current source, then deduped + prioritized. **80 raised → 67 confirmed** (1 high, 21 medium, 45 low).

## Executive Summary

The 67 surviving findings are overwhelmingly **low-severity polish**. The dominant theme by volume is **design-token / focus-ring drift** (~20 findings) where unmigrated screens (`/workout/*`, `/history/*`, `/login`, `/program/new`, add-exercise flow) still use raw `neutral-*` colors and divergent focus-ring spellings instead of the semantic tokens used on the migrated `/program`, `/progress`, and `bottom-nav`. The second-biggest theme is **duplication** — a single `RING` constant copied into 6 files in two incompatible variants, `PHOTO_BUCKET` redeclared in 2 places (a 3rd file imports it correctly), unit-conversion constants (`LB_PER_KG`/`CM_PER_IN`) and a one-decimal formatter scattered across 4 modules, and several hand-copied UI shells (bottom-sheet, exercise-row, 2-tap-confirm, photo-upload loop). There is exactly **one medium-severity correctness bug worth shipping fast** — `deleteSetLog` never calls `revalidatePath`, leaving stale data on `/progress` and `/history/[sessionId]`. The rest of "correctness" is hardening plus deliberately-deferred accepted risks (OTP self-provision, image magic-bytes). Only a handful of items touch load-bearing surfaces, all in `progression.ts` and all documentation/dead-code-only. Nothing here is data-loss; the highest-value work is the `deleteSetLog` cache fix and a batch token/focus-ring sweep.

---

## Status (updated 2026-06-07)

**[PR #104](https://github.com/Rahul-Personal-lists/workout-tracker/pull/104) shipped Tranche 1 (all), Tranche 2, and a Tranche-3 subset** (the `progression.ts` structural cleanups + the `[A2]` time-set focus rings + two hardcoded-ring de-hardcodings). Verified against current source:

- ✅ **Shipped in [#104](https://github.com/Rahul-Personal-lists/workout-tracker/pull/104):** `deleteSetLog` revalidatePath · video-path validation symmetry · `RestTimerBar` hydration guard · `seriesFor` memo + body queries `ascending:true` · all dead-code drops (`target_seconds`, `ProgressBucket.minutes/.sessionId`, `sound-prefs` cookie, `getPhase`/`Phase`) · all Tranche-1 dedup (PHOTO_BUCKET, unit constants, THEME_KEYS, tapVibration, etc.) · `ExerciseChart` hex → CSS vars · `isFinalDeload` extraction + peak-taper TSDoc · `[M3]` CI `--force` → `--no-db` (+ `set -o pipefail`) · `[A2]` time-set focus rings · theme-swatch + exercise-card-zoom focus rings.
- ✅ **Shipped in [#106](https://github.com/Rahul-Personal-lists/workout-tracker/pull/106)** (the two Tranche-2 items #104 missed): `getCustomExercises` now returns `null` (not `""`) when a URL can't be signed, with `CustomExercise` widened to `string | null` and `customToCatalogEntry` omitting the `video` object when unsigned (an empty `<video src>` resolves to the page itself); rest-timer's auto-stop effect dropped `now` from its deps in favour of a one-shot `setTimeout`, so it no longer re-runs on the 250 ms display tick.
- ⏳ **Tranche 3 remainder** (deferred, needs sign-off): per-screen token migration of `/workout/*`,`/history/*`,`/login`,`/program/new`,add-exercise; `FOCUS_RING` constant + app-wide focus-ring spelling unification; `BottomSheet`/`usePointerGesture`/`TopBanner`/`SettingsDetailHeader`/`useArmedConfirm`/`uploadPhotos`/`ExerciseRow` extractions; `[SEC3]` OTP `shouldCreateUser` policy call; `[X4]` `scripts/_env.ts`. `[SEC4]`/`[P1]` remain accepted-risk / deferred-for-scale (no change).

The per-finding sections below are the **as-audited (2026-06-06) snapshot**; consult this status block for what's since shipped.

---

## Correctness

- **Missing `revalidatePath` in `deleteSetLog`** — `src/app/actions/workout.ts:187-200` — Deleting a set leaves stale data in the `/progress` and `/history/{sessionId}` caches because no revalidation fires, unlike every sibling mutation. Add `revalidatePath("/progress")` + `revalidatePath(\`/history/${parsed.sessionId}\`)` matching `editSetLog`. `[sev:M] [effort:S] [behavior-change] [not-load-bearing]`
- **Empty-string fallback instead of `null` for unsigned custom video URLs** — `src/lib/queries.ts:854-855` — `getCustomExercises` falls back to `""` (truthy) when signing fails while `attachVideoUrls` correctly uses `null`, so downstream truthiness checks silently misbehave. Return `?? null` and widen `CustomExercise` to `string | null`. `[sev:M] [effort:S] [behavior-change] [not-load-bearing]`
- **Video-path validation asymmetry** — `src/app/actions/program.ts:58-62` vs `src/app/actions/custom-exercise.ts:51-53` — `addExerciseToProgram` only does a loose prefix check and allows unpaired/null paths, where `createCustomExercise` enforces the tight per-exercise prefix; a crafted input can pass a mismatched `videoPath`. Add a Zod refinement requiring both paths null-or-both-present (and tighten the prefix). `[sev:M] [effort:S] [no-behavior-change for valid clients] [load-bearing — storage path integrity]`
- **`RestTimerBar` lacks the Zustand hydration guard `TimeSetInputRow` has** — `src/components/rest-timer.tsx:34-40` vs `time-set-input-row.tsx:61-68` — A persisted rest timer can flicker idle→active on hydration because the store is read before `persist.hasHydrated()`. Gate reads on `useRestTimer.persist.hasHydrated()` and return null while hydrating. `[sev:M] [effort:M] [no-behavior-change (removes glitch)] [not-load-bearing]`
- **`[SEC3]` `signInWithOtp` defaults `shouldCreateUser:true`** — `src/app/(auth)/login/page.tsx:29` — Any email self-provisions an RLS-isolated workspace. Pass `options:{ shouldCreateUser:false }` *if* signup should be closed — **product/policy call.** `[sev:L] [effort:S] [behavior-change] [auth-altering]`
- **`[SEC4]` `isLikelyImage` trusts client MIME/extension** — `src/lib/photo-upload.ts:6` — Documented accepted risk for single-user. No change today. `[sev:L] [effort:S] [not-load-bearing]`
- **`[M3]` CI catalog refresh runs `--force`, disarming the `primary[]`-change guard** — `.github/workflows/refresh-exercise-catalog.yml:35`, `scripts/refresh-exercise-catalog.ts:278,297` — `--force` suppresses the BLOCK that stops a `primary[]` change (which shifts weekly-summary muscle math). Drop `--force` **and** add `set -o pipefail` (the `| tee` masks the script's exit 1, so dropping `--force` alone is a no-op). `[sev:L] [effort:S] [behavior-change] [not-load-bearing]`

---

## Dead Code

- **`[D10]` `getPhase` / `Phase` unused inside load-bearing `progression.ts`** — `src/lib/progression.ts:100-106` — Zero importers; hardcoded 4/8-week boundaries don't generalize to the new 2–6-day presets. Delete both. **Math file — flag to Rahul, do not auto-apply.** `[sev:L] [effort:S] [no-behavior-change] [in load-bearing file]`
- **`[D11]` `getExerciseHistory` returns unused `target_seconds`** — `src/lib/queries.ts:903,910,929`; consumer `history/exercise/[id]/page.tsx` — Drop from select + return type (keep `kind`). `[sev:L] [effort:S] [no-behavior-change] [not-load-bearing]`
- **`[D12]` `ProgressBucket.minutes` / `.sessionId` computed but never consumed** — `src/lib/queries.ts:1060-1066,1196-1201` + `bucketAgg` at `1162-1182`; consumer `progress-bar-chart.tsx:14` reads only `label`/`workouts` — Drop the bucket fields + feeding aggregation. **`ProgressTotals.minutes` IS used by StatCards — do not touch that.** `[sev:L] [effort:S] [no-behavior-change] [not-load-bearing]`
- **`sound-prefs` cookie written but never read** — `src/app/actions/profile.ts:142-147` — No server-side reader (unlike units cookie); prefs persist in DB via `getProfile`. Delete the cookie-write block. `[sev:L] [effort:S] [no-behavior-change] [not-load-bearing]`

---

## Duplication / Simplification

- **`RING` focus-ring constant duplicated in 6 files, 2 divergent variants** — `library-list.tsx:18`, `library/[programId]/page.tsx:12`, `[dayId]/page.tsx:19`, `start-program-button.tsx:17`, `exercise-library.tsx:32`, `create-custom-exercise-client.tsx:24` — Four use `outline-2/offset`, two use offset-less `ring-2`, so sibling library screens render different focus indicators. Export one canonical `FOCUS_RING` from `lib/utils.ts`. **Canonical spelling (outline vs box-shadow) changes rendered focus → owner sign-off.** `[sev:M] [effort:S] [behavior-change] [not-load-bearing]`
- **`PHOTO_BUCKET` redeclared as a local literal in 2 action files** — `src/app/actions/workout.ts:273`, `src/app/actions/body.ts:7` — `src/lib/photo-upload.ts:1` exports it; `profile.ts:9` already imports it. Import + delete both literals. `[sev:L] [effort:S] [no-behavior-change] [not-load-bearing]`
- **Unit constants + one-decimal formatter scattered across 4+ modules** — `format.ts:3-4,153`, `body-metrics.ts:49,58,67`, `exercise-chart.tsx:16,35`, `estimates.ts:30` — `LB_PER_KG`/`CM_PER_IN`/one-decimal-round copied. Export from `format.ts` and import. **Do NOT collapse `estimates.ts` `LB_TO_KG = 0.45359237` into `1/LB_PER_KG` — they differ at ~1.9e-7 and that shifts calorie output.** `[sev:L] [effort:S] [no-behavior-change for display paths] [not-load-bearing]`
- **Bottom-sheet modal shell hand-copied across 4–5 sheets** — `confirm-sheet.tsx:35`, `rename-program-sheet.tsx:33`, `start-program-button.tsx:129` (ArchiveSheet), `finish-sheet.tsx:45,182`, `library-list.tsx:215` (FilterSheet) — Identical backdrop + `role=dialog` panel + `useDialog` + `stopPropagation` per sheet → independent a11y-drift points. Extract `<BottomSheet open ariaLabel onClose>`. **Fold the 4 token-based sheets behavior-preservingly; FinishSheet inclusion restyles it (separate opt-in).** `[sev:M] [effort:M] [behavior-change for FinishSheet only] [not-load-bearing]`
- **Pointer-gesture detection duplicated between `SwipeRow` and `TutorialOverlay`** — `swipe-row.tsx:32-87`, `tutorial-overlay.tsx:240-281` — Same refs/threshold/disambiguation. Extract a `usePointerGesture(...)` hook. `[sev:M] [effort:M] [no-behavior-change] [not-load-bearing]`
- **`InstallPrompt` and `ServiceWorkerRegister` duplicate banner markup** — `install-prompt.tsx:57-89`, `sw-register.tsx:71-107` — Near-identical top-banner shells. Extract a shared `TopBanner`. `[sev:L] [effort:M] [no-behavior-change] [not-load-bearing]`
- **Vibration `navigator.vibrate` checks duplicated across set-input rows** — `set-input-row.tsx:69-70`, `time-set-input-row.tsx:118-119,127-128` (helper exists at `step-cue.ts:56-59`) — Add a `tapVibration()` to `step-cue.ts` and call it in all three. `[sev:M] [effort:S] [no-behavior-change] [not-load-bearing]`
- **`toEstimate` + `setsLabel` copied verbatim across preview and plan-detail** — `preset-preview.tsx:13,19`, `library/[programId]/[dayId]/page.tsx:22,32` — Export `starterToEstimate` from `estimates.ts` and `formatStarterSets` from one module; import in both. `[sev:L] [effort:S] [no-behavior-change] [not-load-bearing]`
- **2-tap-within-4s destructive-confirm hand-rolled twice** — `delete-session.tsx:11-25` (no cleanup) vs `profile-client.tsx:212-227` (clears its timer) — Extract `useArmedConfirm(onConfirm,{timeoutMs})`. **Must thread `useTransition` pending + per-site error handling — not mechanical.** `[sev:L] [effort:S] [no-behavior-change if careful] [not-load-bearing]`
- **Client photo upload+rollback loop duplicated** — `photo-detail.tsx:65`, `workout-client.tsx:298` — Same size-check/`isLikelyImage`/upload/rollback loop with drifted "too large" wording. Extract `uploadPhotos(...)`. **`workout-client` renders a partial-success message `photo-detail` lacks — naive shared helper changes that UX.** `[sev:L] [effort:M] [behavior-change risk] [not-load-bearing]`
- **Exercise list-row shell duplicated between hub and library plan-detail** — `program/page.tsx:252`, `library/[programId]/[dayId]/page.tsx:118` — Extract `<ExerciseRow>` leaving each page its trailing string. **Differs in video props + muscle-arg + data shape — borderline vs "no new abstractions."** `[sev:L] [effort:S] [no-behavior-change] [not-load-bearing]`
- **`VANCOUVER_TZ` redefined in the email component** — `src/emails/weekly-summary.tsx:19` (export at `src/lib/weekly-summary.ts:15`) — Import from `@/lib/weekly-summary`. `[sev:L] [effort:S] [no-behavior-change] [not-load-bearing]`
- **Theme keys duplicated between `THEMES` and `THEME_KEYS`** — `theme-picker.tsx:7-13`, `theme/page.tsx:6` — Export `THEME_KEYS = THEMES.map(t=>t.key)` and import. `[sev:L] [effort:S] [no-behavior-change] [not-load-bearing]`
- **Settings back-button header markup duplicated across 5 pages** — `settings/{profile,theme,units,sounds,help}/page.tsx` — Extract `<SettingsDetailHeader title=...>`. `[sev:L] [effort:S] [no-behavior-change] [not-load-bearing]`
- **`EditableSetRow.cancel()` re-derives initial state** — `set-editor.tsx:49-58` vs `115-122` — Extract an `init*` helper reused by both. `[sev:L] [effort:S] [no-behavior-change] [not-load-bearing]`
- **`[X4]` `loadEnv` duplicated across 7 dev scripts; `test-otp.ts` lacks `.catch`** — `scripts/*.ts` — Extract `scripts/_env.ts`; add `.catch`. **The `.catch` add is an exit-code behavior change — dev-tooling only.** `[sev:L] [effort:S] [behavior-change (exit code)] [not-load-bearing]`
- **`isFinalDeload` duplicated between `getPlannedWeight` and `getPlannedReps`** — `src/lib/progression.ts:19-24,73-76` — Extract `isFinalDeload(weekNumber, deloadWeeks)`. **Load-bearing math file — flag to Rahul before touching.** `[sev:L] [effort:S] [no-behavior-change] [in load-bearing file]`
- **Redundant unreachable empty-array check in `getCustomExercises`** — `src/lib/queries.ts:838-839` — Remove line 839. `[sev:L] [effort:S] [no-behavior-change] [not-load-bearing]`
- **Volume rounded at two display sites in `weekly-summary.ts`** — `src/lib/weekly-summary.ts:189,255` — Add a JSDoc note / rounding wrapper (clarity only). `[sev:L] [effort:S] [no-behavior-change] [not-load-bearing]`
- **`BrandWordmark` splits a hardcoded string on every render** — `src/components/brand-wordmark.tsx:6-17` — Hardcode the char array. `[sev:L] [effort:S] [no-behavior-change] [not-load-bearing]`

---

## Maintainability

- **Inconsistent Supabase client param type annotation across actions** — `body.ts:51` vs `workout.ts:123` / `program.ts:150,254,266,278` — Standardize on one (a local `type SupabaseClient = ...` alias). `[sev:L] [effort:S] [no-behavior-change] [not-load-bearing]`
- **`ExerciseChart` hardcodes Recharts hex colors instead of CSS vars** — `src/app/(app)/history/exercise/[id]/exercise-chart.tsx:41-93` — Hex literals (`#262626`, `#10b981`, …) break accent-theme switching, unlike `ProgressBarChart`/`BodyChart`. Map to `var(--color-*)`. `[sev:M] [effort:S] [no-behavior-change in default theme] [not-load-bearing]`
- **Missing explicit load-bearing note on custom-video snapshotting** — `src/app/actions/program.ts:36-48` — Enhance the comment to state the "at add time" snapshot semantic explicitly (mirrors `planned_*`). `[sev:L] [effort:S] [no-behavior-change] [load-bearing — snapshotting]`
- **Peak-taper magic week numbers undocumented** — `src/lib/progression.ts:84-87` — Add a TSDoc explaining the 12-week taper schedule. **Math file — flag to Rahul.** `[sev:L] [effort:S] [no-behavior-change] [in load-bearing file]`
- **`DayNotePopover` hand-rolls escape/click-outside** — `src/components/day-note-popover.tsx:17-32` — **Leave as-is — extraction is premature abstraction (verifier flagged not-safe).** `[sev:L] [effort:M] [no-behavior-change] [not-load-bearing]`
- **`TutorialOverlay` `TOUR_STEPS` uses unvalidated `data-tour` magic strings** — `tutorial-overlay.tsx:26-102,167` — Add a dev-only `console.warn` when a selector isn't found after retry. `[sev:L] [effort:S] [no-behavior-change (dev-only)] [not-load-bearing]`
- **`TutorialOverlay` and `OnboardingPicker` both use `z-50`** — `onboarding-picker.tsx:93`, `tutorial-overlay.tsx:393` — Drop `OnboardingPicker` to `z-45`. `[sev:L] [effort:S] [no-behavior-change today] [not-load-bearing]`

---

## Performance

- **`seriesFor()` re-filters/re-sorts per metric every render** — `src/app/(app)/body/body-client.tsx:49-70,72-85,167` — Called 9×/render, each O(n log n). Memoize into a single `Map<MetricKey, MetricSeriesPoint[]>`. `[sev:M] [effort:M] [no-behavior-change] [not-load-bearing]`
- **Body queries return descending; `seriesFor` re-sorts ascending** — `src/lib/queries.ts:759,781` + `body-client.tsx:69` — Change `getBodyLogs`/`getBodyMeasurements` to `.order('log_date',{ascending:true})` and drop the in-component sort. `[sev:L] [effort:S] [no-behavior-change] [not-load-bearing]`
- **`now` in rest-timer expiry effect deps causes 250ms re-runs** — `src/components/rest-timer.tsx:59-64` — Effect uses `Date.now()` directly but lists `now` in deps. Remove `now` from the dep array. `[sev:L] [effort:S] [no-behavior-change] [not-load-bearing]`
- **`[P1]` `getLastSessionHints` / `getAllTimeTopByExercise` pull full history, reduce in JS** — `src/lib/queries.ts:427-456,492-523` — **Leave as-is (explicitly deferred); a DB-side RPC must reproduce the exact tie-break + NULL semantics.** `[sev:L] [effort:M] [behavior-change if optimized] [not-load-bearing]`

---

## Consistency / Tokens

> The token + focus-ring drift below is one theme repeated per screen. `/workout/*`, `/history/*`, `/login`, `/program/new` are on CLAUDE.md's **deferred per-screen migration list** — sanctioned debt, and migrating them is a **behavior change** (semantic tokens are theme-aware across 5 themes; raw `neutral-*` are fixed greys). Watch `text-neutral-500` → `text-foreground-muted` collapses (only one muted tier) and login's `bg-neutral-950/80` (no clean token).

- **`[X5]` Hardcoded neutral colors across deferred screens** — finish-sheet/photo-thumb, `/program/new` + preset-list/preview + blank-program-form, add-exercise flow, exercise-media/animation, history pages, login — Migrate per-screen as touched. **add-exercise flow is highest-severity here (H); rest M/L.** `[sev:H→L] [effort:S–M] [behavior-change] [not-load-bearing]`
- **Focus-ring style inconsistency (ring vs outline, hardcoded values)** — `exercise-card.tsx:173`, `bottom-nav.tsx:36` (hardcoded `ring-accent`/`ring-offset-black`), `range-tabs.tsx:37`, `measures-list.tsx:33,58`, history vs progress modules, settings back buttons + theme swatches + theme-picker buttons (missing rings entirely) — Standardize on one CSS-var spelling app-wide and add rings where missing. **Pairs with `FOCUS_RING` extraction; canonical spelling needs owner sign-off.** `[sev:M] [effort:S–M] [behavior-change] [not-load-bearing]`
- **`[A2]` Time-set Start/Stop/complete buttons lack the focus ring their reps-row sibling has** — `time-set-input-row.tsx:180,196,207,215` vs `set-input-row.tsx:139` — Add the `focus-visible` outline to all four. `[sev:L] [effort:S] [behavior-change] [not-load-bearing]`
- **Inconsistent `eslint-disable` syntax in `time-set-input-row.tsx`** — `:63` (next-line) vs `:87-89` (block) for the same rule — Standardize on next-line. `[sev:L] [effort:S] [no-behavior-change] [not-load-bearing]`
- **Disabled `RangeNav` chevron keeps focus styles though non-focusable** — `range-nav.tsx:40-48` — Strip focus classes from the disabled state. `[sev:L] [effort:S] [no-behavior-change] [not-load-bearing]`

---

## Accessibility / Security

- **Accessibility:** covered above under Consistency (the `[A2]` time-set focus rings + missing rings on settings/theme-picker controls). Pinch-zoom/skip-link baselines already respected. No standalone a11y findings remain beyond the focus-ring cluster.
- **Security:** both items are deliberately-deferred accepted risks listed under Correctness — `[SEC3]` OTP self-provision (policy call) and `[SEC4]` image magic-bytes (single-user accepted).

---

## Recommended Implementation Order

### Tranche 1 — Safe, behavior-preserving dead-code + duplication (ship immediately)
*No observable behavior change, no sign-off. Verify with `tsc --noEmit` + `npm run lint` + build.*

- `[D11]` Drop unused `target_seconds` from `getExerciseHistory`
- `[D12]` Drop unused `ProgressBucket.minutes` / `.sessionId` (keep `ProgressTotals.minutes`)
- `sound-prefs` cookie removed (dead write)
- `PHOTO_BUCKET` redeclarations → import from `@/lib/photo-upload`
- Unit constants + one-decimal formatter consolidated into `format.ts` (**display paths only — NOT `estimates.ts` `LB_TO_KG`**)
- `VANCOUVER_TZ` imported in the email component
- `THEME_KEYS` derived from `THEMES`
- `toEstimate` + `setsLabel` extracted to shared module
- Vibration check → shared `step-cue.ts` helper
- `EditableSetRow.cancel()` init-helper extraction
- Redundant `getCustomExercises` length check removed
- `BrandWordmark` precomputed char array
- Supabase client param type standardized
- `eslint-disable` syntax standardized in `time-set-input-row.tsx`
- Disabled `RangeNav` chevron focus classes stripped
- Custom-video snapshotting comment enhanced (doc only)
- Volume-rounding JSDoc note (doc only)
- `TutorialOverlay`/`OnboardingPicker` z-index split; dev-only tour-target `console.warn`

### Tranche 2 — Low-risk correctness + perf fixes
*Behavior changes in the correct direction; bounded blast radius.*

- **`deleteSetLog` missing `revalidatePath`** (highest-value — fixes stale `/progress` + `/history` data)
- `getCustomExercises` empty-string → `null` fallback
- `RestTimerBar` hydration guard (removes flicker)
- `seriesFor()` memoization into one `Map`
- Body queries `ascending:true` + drop in-component sort
- Rest-timer `now` dep removed
- Video-path validation symmetry (`addExerciseToProgram` Zod refinement) — *storage-path integrity; no valid client affected*
- `ExerciseChart` hex → CSS vars (theme-correct; visually identical in default theme)

### Tranche 3 — Behavior-changing / load-bearing / larger items (owner sign-off)
*Each changes observable behavior, a policy, or touches a fenced file.*

- **`progression.ts` (FLAG TO RAHUL — load-bearing math, do not auto-apply):** `[D10]` delete dead `getPhase`/`Phase`; extract `isFinalDeload` helper; add peak-taper week-numbers TSDoc. *(All non-behavioral, but the file is fenced.)*
- **Token migration of deferred screens** (`/workout/*`, `/history/*`, `/login`, `/program/new`, add-exercise flow) — per-screen, theme-aware behavior change; watch `neutral-500` tier collapse + login `bg-neutral-950/80`
- **`FOCUS_RING` constant + app-wide focus-ring standardization** — canonical outline-vs-ring spelling is an a11y/design decision; includes `[A2]` time-set buttons + missing rings on settings/theme-picker controls
- **Bottom-sheet shell extraction** — token-based sheets behavior-preserving; **FinishSheet inclusion restyles it (separate opt-in)**
- `usePointerGesture` extraction — new shared hook
- `TopBanner` extraction (`InstallPrompt`/`ServiceWorkerRegister`) — new shared component
- `SettingsDetailHeader` extraction — new shared component
- `useArmedConfirm` extraction — must thread `useTransition` pending + per-site error handling
- `uploadPhotos` helper — changes `workout-client`'s partial-success messaging + consolidates drifted wording
- `ExerciseRow` shared component — borderline vs the "no new abstractions" rule
- `[SEC3]` OTP `shouldCreateUser:false` — **product/policy call**
- `[M3]` Drop `--force` from CI catalog refresh **+ add `set -o pipefail`** (ops decision)
- `[X4]` `loadEnv` → `scripts/_env.ts` + `test-otp.ts` `.catch` (exit-code change; dev-tooling)
- `[SEC4]` / `[P1]` — **no change** (accepted risk / deferred-for-scale; listed for closure only)

---

## Contradictions / Conflicts

- **No hard logical contradictions.** One tension: the `ExerciseRow` / `useArmedConfirm` / `DayNotePopover` extractions push toward shared abstractions, while the project's standing rule is *"don't add abstractions unless a screen needs them."* `DayNotePopover` was verified as premature abstraction (leave as-is); `ExerciseRow` is borderline and routed to Tranche 3 for owner judgment.
- **Overlap, not conflict:** the finish-sheet token-drift finding and the bottom-sheet shell extraction both touch FinishSheet's raw `neutral-*` colors — sequence them together (extract the shell, then FinishSheet's token migration rides along as the explicit opt-in).
