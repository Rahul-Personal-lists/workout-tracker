@AGENTS.md
@.claude/sessions.md

# Workout Tracker — project memory

Mobile-first PWA Rahul uses to log strength programs at the gym. Personal app, single user, multi-user-ready (RLS on every table). Ships with a 21-program preset library (`PRESET_PROGRAMS` in [starter-program.ts](src/lib/starter-program.ts) — the original 4: 12-week strength, PPL, Upper/Lower, Full Body 3x, plus 17 Stage-5 catalog programs spanning 2–6 days/week, all goals/splits, home + commercial; every "N Days a Week" section offers all three goals) browsable at `/program/library`, and a blank-program builder; up to 2 programs per user with one active. The `/program` empty state shows a curated 4-program quick-picker (`QUICK_PICK_IDS` in `preset-list.tsx`); `/program/new` itself is just a two-option chooser (Browse the library / Start from scratch), so the full catalog lives only at `/program/library`. The app shell is built; iteration is now driven by what actually hurts at the gym.

## Stack (actual)

- **Next.js 16** App Router (Turbopack for dev/build) — TypeScript strict, `src/` dir
- **Tailwind v4** (the new `@theme` syntax in [globals.css](src/app/globals.css)). No shadcn yet — primitives are hand-rolled, lucide for icons.
- **Supabase**: Postgres + Auth (magic-link only). RLS on all tables. Types via `npm run db:types`.
- **@supabase/ssr** for SSR/middleware cookie handling. Pinned to `^0.10` — older versions don't pass the `Database` generic correctly.
- **Zod** for server-action input validation
- **Zustand** (for rest timer state with localStorage persist via `partialize`)
- **Recharts** for the per-exercise progress chart
- **date-fns** for formatting
- **TanStack Query** is in `package.json` but **not used yet** — server actions + RSC handle everything so far. Don't add it unless we hit a use case.
- **PWA**: hand-rolled (manifest in [src/app/manifest.ts](src/app/manifest.ts), tiny SW in [public/sw.js](public/sw.js), registered only in production via [src/components/sw-register.tsx](src/components/sw-register.tsx)). `@ducanh2912/next-pwa` is in deps but not used — Turbopack-build compatibility was unclear.

## Core conventions

- **Server Components by default.** Client only where needed (forms with state, the workout logging UI, charts, the rest timer).
- **Server Actions** live in `src/app/actions/*.ts`. All mutations go through Zod-validated actions. No separate API layer.
- **DB queries** centralized in [src/lib/queries.ts](src/lib/queries.ts) (`import "server-only"`). Don't query Supabase directly from pages — call a query helper.
- **Image source** for exercise reference pics is `yuhonas/free-exercise-db` (public domain). Each exercise has `/0.jpg` (start) and `/1.jpg` (end). UI in [src/components/exercise-animation.tsx](src/components/exercise-animation.tsx) layers them and CSS-flips opacity (`@keyframes exercise-flip` in globals.css). No JS animation loop.
- **Bottom nav** ([src/components/bottom-nav.tsx](src/components/bottom-nav.tsx)) — 4 tabs (Program / Progress / Body / Settings). Auto-hides on `/workout/*` and `/program/edit` so the action footer isn't covered and the user stays focused mid-set.
- **Auth gate** is in [src/proxy.ts](src/proxy.ts) → `updateSession()` in [src/lib/supabase/middleware.ts](src/lib/supabase/middleware.ts). (Next.js 16 renamed the `middleware.ts` file convention to `proxy.ts`; `updateSession` itself still lives in `lib/supabase/middleware.ts`, which was **not** renamed.) This is the **single** auth gate — the `(app)` layout is presentational and does **not** re-check auth, so correctness depends on the proxy matcher staying correct plus RLS.
- **Design tokens.** Semantic CSS variables in [globals.css](src/app/globals.css) under `@theme`:
  - Surfaces — `--color-surface` (cards), `--color-surface-hover`, `--color-surface-subtle`
  - Borders — `--color-border` (default), `--color-border-strong` (dashed CTAs)
  - Foreground — `--color-foreground` (primary), `--color-foreground-muted` (single muted tier; the dark palette has no contrast headroom for a third tier — there is no `subtle`)
  - Focus ring — `--focus-ring-width` / `--focus-ring-offset` / `--focus-ring-color` (refs `--color-accent`, theme-aware)

  Prefer `bg-surface` / `border-border` / `text-foreground-muted` over `bg-neutral-900` / `border-neutral-800` / `text-neutral-{400,500}` in new code. `/program`, `/progress`, and `bottom-nav` are migrated; other screens (`/workout/*`, `/history/*`, `/body`, `/settings` detail, `/login`) still use raw `text-neutral-*` and migrate per-screen.
- **A11y baseline** (from the `/today` audit, applies app-wide): pinch-zoom must stay enabled, every interactive element needs a `:focus-visible` ring, the bottom nav has `aria-label="Primary"` + `aria-current="page"` on the active tab, and `(app)/layout.tsx` carries a skip-to-main link targeting `<main id="main">`.

## DB schema (all RLS-owner-scoped)

```
programs              — up to 2 per user, exactly one is_active. weeks + deload_weeks. archived_at (soft delete).
  └─ program_days     — N rows per program. archived_at (soft delete).
       └─ program_exercises — has image_url, archived_at (soft delete)
workout_sessions      — started_at, ended_at, week_number, generated duration_seconds
  └─ set_logs         — planned_* snapshotted at log time, FK no-cascade to program_exercises
```

- **Soft delete** via `programs.archived_at`, `program_days.archived_at`, and `program_exercises.archived_at`. Hard delete is blocked by FKs (`set_logs.program_exercise_id`, `workout_sessions.program_day_id`) once any session/log references the row. `/history/[sessionId]` uses `getSessionContext(sessionId)`, which resolves the session's day + parent program via FK chain — so past sessions render correctly across both programs (active or not) and across archived days/exercises.
- **Multi-program**: a user can have up to **2 non-archived programs**. Exactly one is `is_active = true`, enforced by the partial unique index `programs_one_active_per_user`. Server actions that promote a program (`seedPresetProgram`, `createBlankProgram`, `setActiveProgram`) **must demote the existing active one in the same call** before promoting, or the index will reject the write.
- **`planned_weight` / `planned_reps`** in `set_logs` are **snapshotted at log time** so changing the program later doesn't rewrite history.

Migrations to date:
- `20260426000000_init.sql` — base schema (5 tables, RLS, generated `duration_seconds`)
- `20260427000000_add_exercise_image.sql` — `image_url`
- `20260427100000_archive_exercises.sql` — `archived_at` on `program_exercises`
- `20260427200000_photos_and_body_logs.sql` — `workout_session_photos`, `body_logs`, `workout-photos` bucket
- `20260428000000_programs_editing.sql` — `is_active` + `archived_at` on `programs`, `archived_at` on `program_days`, partial unique index for active program
- `20260430000000_swap_day_order.sql` — `swap_day_order` RPC (two later same-name files `20260501030916` / `20260501031002` are **empty no-ops**)
- `20260502000000_profiles.sql` — `profiles` (display_name)
- `20260503000000_progression_weeks.sql` — per-exercise `progression_weeks` (1–8)
- `20260504000000_pause_session.sql` — `paused_at` + `total_paused_seconds`; **redefines** `duration_seconds` to subtract paused time; `resume_session()` RPC
- `20260516000000_cardio_exercises.sql` — `kind`/`target_seconds` + `planned_seconds`/`actual_seconds` (+ cardio backfill)
- `20260519000000_peak_taper.sql` — `peak_taper` boolean
- `20260528000000_body_goals_and_photos.sql` — `goal_weight_lb`, `body_fat_pct`, `body_log_photos`
- `20260529000000_body_measurements.sql` — `body_measurements` table
- `20260529000001_settings_extras.sql` — profile gender/age/height/avatar/units/sound prefs (was `20260529000000`, a duplicate timestamp; renamed to `…000001` and reconciled on remote via `migration repair` so the histories match — give fresh-env migrations distinct timestamps going forward)
- `20260530000000_rest_skip_flag.sql` — `is_rest_skip` on `workout_sessions` (explicit rest-day-skip flag; replaces the `duration_seconds = 0` sentinel so Undo can't delete a real zero-duration workout)
- `20260530120000_body_log_weight_optional.sql` — `weight_lb` on `body_logs` made **nullable** so body fat / calories can be logged for a date without a weight; replaces the implicit "weight required" rule with a `num_nonnulls(weight_lb, body_fat_pct, calories) > 0` CHECK (`body_logs_at_least_one_metric`) so the shared daily row still can't be empty
- `20260604000000_exercise_favorites.sql` — `exercise_favorites` table (catalog-level favorites keyed by free-exercise-db slug; RLS owner-scoped, PK `(user_id, exercise_slug)`). Read via `getFavoriteSlugs()` (degrades to empty on error), toggled by `toggleFavorite`. **Must be `npx supabase db push`-ed for favorites to persist.**
- `20260606000000_custom_exercises.sql` — `custom_exercises` table (per-user video exercises, RLS owner-scoped) + 8 snapshot columns on `program_exercises` (`video_path`/`poster_path`/`crop_rect`/`trim_start_seconds`/`trim_end_seconds`/`aspect_ratio`/`muscles` + nullable provenance FK `custom_exercise_id` `on delete set null`). Media lives in the shared `workout-photos` bucket under `{uid}/exercise-videos/{id}/` (`VIDEO_BUCKET`); reframe/trim are non-destructive playback metadata. Soft-delete only (`archived_at`).

After a migration: `npx supabase db push && npm run db:types`. Don't hand-edit `database.types.ts`. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full ER diagram and [docs/CODE_AUDIT.md](docs/CODE_AUDIT.md) for the prioritized findings backlog.

## Progressive overload

Lives in [src/lib/progression.ts](src/lib/progression.ts):
- Week 1 = baseline; each non-deload week adds `increment` per exercise.
- Deload weeks (4, 8, 12 for the seeded program) = 70% of that week's normal load, rounded to 2.5 lb.
- Strength sets of 5 reps bump to 6 reps from week 9 onward.

Don't change the math without flagging — Rahul has explicit weekly expectations.

## Routes

```
src/app/
├── (auth)/login                   email → 6-digit OTP form
├── (app)/
│   ├── program                    HUB: day pills across the program, next-up card,
│   │                              Start/Redo, 2-program switcher, rest-day skip/undo.
│   │                              Empty state = preset picker. (Absorbed the old /today.)
│   │   ├── add                    catalog search → config form
│   │   ├── edit                   reorder / delete a day's exercises
│   │   ├── exercises              interactive front/back body-map → tap a muscle to
│   │   │                          filter; 2-col catalog grid w/ ★ favorites. force-dynamic.
│   │   ├── library                Program Library: browse preset catalog grouped by
│   │   │   │                      "N Days a Week", Gym Location + Experience filters.
│   │   │   │                      List is static; drill-ins are force-dynamic.
│   │   │   └── [programId]        program landing (hero + "Workouts" list: Day 1, Day 2…)
│   │   │       │                  + Start CTA →
│   │   │       └── [dayId]        day detail: stat row + exercise rows (thumb +
│   │   │                          muscle badge) + Day tabs + sticky Start. Start CTA
│   │   │                          seeds via seedPresetProgram; at the 2-program cap it
│   │   │                          opens an archive-one sheet instead of erroring.
│   │   └── new (+ new/custom)     chooser: Browse the library / Start from scratch (/custom = blank builder)
│   ├── workout/[sessionId]        active logging UI (RestTimerBar lives here)
│   ├── progress                   analytics: range tabs, stat cards, workout-count chart,
│   │                              muscle-map, + a month grid (tap a day → /history/[sessionId])
│   ├── body                       weight / measurements / progress photos + trends
│   ├── history                    (no list page; only the detail routes below)
│   │   ├── [sessionId]            session detail (planned-vs-actual); Redo + "Delete this
│   │   │                          workout" (2-tap-within-4s confirm via DeleteSessionButton)
│   │   └── exercise/[id]          Recharts top-set-per-session
│   └── settings (+profile/units/sounds/theme/help)   prefs hub + detail spokes; sign-out
│                                  lives inside /settings/profile
└── api/auth/callback              Supabase code exchange
    api/cron/weekly-summary        Resend weekly email (Bearer + Sunday-window gate)
```

Bottom nav is 4 tabs: **Program / Progress / Body / Settings**. There is **no `/today`** (removed; `/program` absorbed it) and **no `/calendar`** (the month grid lives inside `/progress`).

Workouts are deleted **one at a time** from the history detail page; there is no bulk "wipe all sessions" action. The previous `wipeAllSessions` was removed — `deleteSession(sessionId)` is the only delete path. It cleans up the session's photos in storage first, then deletes the row (set_logs and workout_session_photos cascade via FK on session_id).

Server actions:
- [src/app/actions/workout.ts](src/app/actions/workout.ts) — startWorkout, skipRestDay, undoLastSkip, logSet, editSetLog, deleteSetLog, editSessionDuration, finishWorkout, recordSessionPhotos, deleteSessionPhoto, deleteSession
- [src/app/actions/program.ts](src/app/actions/program.ts) — addExerciseToProgram, archive/unarchiveExerciseFromProgram, setExerciseOrder, saveDayEdits, seedPresetProgram, createBlankProgram, setActiveProgram, archiveProgram, addDay, reorderDay
- [src/app/actions/body.ts](src/app/actions/body.ts) — upsert/deleteBodyLog, upsert/deleteBodyMeasurement, setGoalWeight, recordBodyPhotos, deleteBodyPhoto
- [src/app/actions/profile.ts](src/app/actions/profile.ts) — setProfileFields, setAvatar, clearAvatar, setUnits, setSoundPrefs, deleteAccount
- [src/app/actions/favorites.ts](src/app/actions/favorites.ts) — toggleFavorite (catalog-level ★, keyed by exercise slug)
- [src/app/actions/custom-exercise.ts](src/app/actions/custom-exercise.ts) — createCustomExercise, deleteCustomExercise (soft), signCustomVideoUrl (re-sign on mid-session 403)

## Setup / run

```bash
cp .env.local.example .env.local         # NEXT_PUBLIC_SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push                      # apply all migrations
npm run db:types                          # regen database.types.ts
npx tsx scripts/seed-program.ts <email>   # idempotent: creates user + program OR backfills image_url

npm run dev                               # http://localhost:3000
npm run typecheck
```

The seed script auto-creates the auth user (admin API) if missing, and on re-run only updates `image_url` for existing rows by exercise name.

## Previewing auth-gated pages (for Claude)

Every `(app)/*` route is behind the magic-link OTP gate in [src/proxy.ts](src/proxy.ts) (Next.js 16's renamed `middleware` convention).

**Use the test account `claude-test@example.com` for any verification that touches workout/program/session data.** Rahul's real account (`rahul@satel.ca`) tracks his actual program — starting a workout, skipping rest days, or reordering exercises there mutates real data he needs at the gym. The test account is a throwaway with the same seeded 12-week program, so all flows render identically.

To authenticate the preview browser:

1. `preview_start` → `next-dev`.
2. Generate an OTP server-side (no email is sent):
   ```bash
   npx tsx scripts/test-otp.ts  # defaults to claude-test@example.com
   ```
3. Set cookies via `@supabase/ssr`'s `createBrowserClient` (pulls URL/anon from `.env.local`):
   ```js
   // Clear any prior session first if you're switching accounts.
   document.cookie.split(';').forEach(c => {
     const name = c.split('=')[0].trim();
     if (name.startsWith('sb-')) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
   });
   const { createBrowserClient } = await import('https://esm.sh/@supabase/ssr@0.10');
   const sb = createBrowserClient('<NEXT_PUBLIC_SUPABASE_URL>', '<NEXT_PUBLIC_SUPABASE_ANON_KEY>');
   await sb.auth.verifyOtp({ email: 'claude-test@example.com', token: '<otp>', type: 'email' });
   ```
4. `window.location.assign('http://localhost:3000/<route>')` — cookies are now set.

If a flow specifically needs Rahul's real history (e.g. verifying a UI bug only on his data), ask him for the OTP that hits his inbox after submitting the login form — but **clean up any sessions you create** before ending the turn (use service-role to delete the session row by id).

Re-rendering React-controlled inputs from `preview_eval` needs the native setter, not `.value =`:
```js
const i = document.querySelector('input[type=email]');
const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
set.call(i, 'foo@bar.com');
i.dispatchEvent(new Event('input', { bubbles: true }));
```

Watch out: Supabase rate-limits `signInWithOtp` (~60s between sends). The `scripts/test-otp.ts` admin path doesn't trigger that, so prefer it.

## Known limitations / deferred

- **Offline write queue.** Decided to ship without it; revisit if connection actually drops at the gym. Plan was IndexedDB queue on `logSet` calls + flush on reconnect.
- **No "cancel session" action.** `startWorkout` redirects to any existing open session instead of creating a duplicate (server-side guard in [actions/workout.ts](src/app/actions/workout.ts), plus the Start button now disables while the action is pending), but there's no UI to abandon a session you don't want to finish. The session sits as `ended_at = null` until you manually finish or delete it from history.
- **Mid-workout exercise add.** New exercises only appear in *future* sessions of that day. The active in-progress session won't pick them up.
- **Day/program structure edits during an active session.** `setActiveProgram` blocks while a session is in-progress, but archiving the day of an in-progress session is not blocked — avoid it manually.
- **No program-level editor for weeks/deloads after creation** — only days and exercises. Change weeks/deloads by archiving and re-creating.
- **Max 2 programs.** Trying to create a 3rd is rejected — user must archive one first. No UI to unarchive yet.
- **No "archive day" action.** Removed from the UI — if you want a day gone, delete its exercises via the pencil/edit page. The `program_days.archived_at` column still exists for soft-delete safety, but no code paths set it anymore.
- **PWA shell caching only.** No real offline data; no install prompt UI (relies on browser/iOS native install).

## Don't

- Don't add abstractions or component libraries unless an actual screen needs them. Stay terse.
- Don't add comments to "explain what" — naming covers that. Comments only for non-obvious why's (e.g. `setAll(cookiesToSet)` typing in supabase/server.ts, the hidden-on-/workout reasoning in bottom-nav).
- Don't change `planned_*` snapshotting semantics in set_logs without flagging — it's load-bearing for history accuracy.
- Don't hand-edit `src/lib/supabase/database.types.ts` — regenerate via `npm run db:types`.
- Don't bypass the partial unique index `programs_one_active_per_user`. When promoting a program to active, demote the existing active one **first** in the same server action (see `seedPresetProgram` / `setActiveProgram` for the pattern).
- Don't disable user zoom in the viewport (`userScalable: false` / `maximumScale: 1`). Pinch-zoom is required for low-vision users (WCAG 1.4.4) and was explicitly removed from `src/app/layout.tsx`.
- Don't hardcode focus-ring values — reference the `--focus-ring-*` CSS variables (or `--color-accent` for the color) so accent-theme switching keeps working across all five themes.
