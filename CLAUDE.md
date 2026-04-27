@AGENTS.md

# Workout Tracker — project memory

Mobile-first PWA Rahul uses to log his 12-week strength program at the gym. Personal app, single user, multi-user-ready (RLS on every table). The app shell is built; iteration is now driven by what actually hurts at the gym.

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
- **Bottom nav** ([src/components/bottom-nav.tsx](src/components/bottom-nav.tsx)) auto-hides on `/workout/*` so the Finish button isn't covered and the user stays focused mid-set.
- **Auth gate** is in [src/middleware.ts](src/middleware.ts) → [src/lib/supabase/middleware.ts](src/lib/supabase/middleware.ts). The `(app)` layout also redirects, defense-in-depth.

## DB schema (all RLS-owner-scoped)

```
programs              — one per user, holds weeks + deload_weeks
  └─ program_days     — 4 rows per program (Day 1–4)
       └─ program_exercises — has image_url, archived_at (soft delete)
workout_sessions      — started_at, ended_at, week_number, generated duration_seconds
  └─ set_logs         — planned_* snapshotted at log time, FK no-cascade to program_exercises
```

- **Soft delete** via `program_exercises.archived_at`. Hard delete is blocked by the FK on `set_logs` once you've logged the exercise. `getCurrentProgram({ includeArchived: true })` is used by `/history/[sessionId]` so old logged exercises still render in past sessions.
- **`planned_weight` / `planned_reps`** in `set_logs` are **snapshotted at log time** so changing the program later doesn't rewrite history.

Migrations to date:
- `20260426000000_init.sql` — base schema
- `20260427000000_add_exercise_image.sql` — `image_url`
- `20260427100000_archive_exercises.sql` — `archived_at`

After a migration: `npx supabase db push && npm run db:types`. Don't hand-edit `database.types.ts`.

## Progressive overload

Lives in [src/lib/progression.ts](src/lib/progression.ts):
- Week 1 = baseline; each non-deload week adds `increment` per exercise.
- Deload weeks (4, 8, 12 for the seeded program) = 70% of that week's normal load, rounded to 2.5 lb.
- Strength sets of 5 reps bump to 6 reps from week 9 onward.

Don't change the math without flagging — Rahul has explicit weekly expectations.

## Routes

```
src/app/
├── (auth)/login                   magic-link form
├── (app)/
│   ├── today                      next-up workout card → starts session
│   ├── workout/[sessionId]        active logging UI (RestTimerBar lives here)
│   ├── program                    week selector + day cards (Start W{n} per day, + Add exercise)
│   │   └── add                    catalog search → config form
│   ├── history                    session list
│   │   ├── [sessionId]            session detail with planned-vs-actual
│   │   └── exercise/[id]          Recharts top-set-per-session
│   └── settings                   user info, sign out, danger zone (wipe sessions)
└── api/auth/callback              Supabase code exchange
```

Server actions:
- [src/app/actions/workout.ts](src/app/actions/workout.ts) — startWorkout, logSet, finishWorkout, wipeAllSessions
- [src/app/actions/program.ts](src/app/actions/program.ts) — addExerciseToProgram, archiveExerciseFromProgram, unarchiveExerciseFromProgram

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

## Known limitations / deferred

- **Offline write queue.** Decided to ship without it; revisit if connection actually drops at the gym. Plan was IndexedDB queue on `logSet` calls + flush on reconnect.
- **Multiple in-progress sessions.** `startWorkout` doesn't block creation of a second session if one's already active. `/today` redirects to most recent, so it's not destructive — just messy. Add a "cancel session" action if this gets annoying.
- **Mid-workout exercise add.** New exercises only appear in *future* sessions of that day. The active in-progress session won't pick them up.
- **No program editor for weeks/days/deloads** — only exercises. Multi-program support is also not built. Single program assumed throughout queries.
- **PWA shell caching only.** No real offline data; no install prompt UI (relies on browser/iOS native install).

## Don't

- Don't add abstractions or component libraries unless an actual screen needs them. Stay terse.
- Don't add comments to "explain what" — naming covers that. Comments only for non-obvious why's (e.g. `setAll(cookiesToSet)` typing in supabase/server.ts, the hidden-on-/workout reasoning in bottom-nav).
- Don't change `planned_*` snapshotting semantics in set_logs without flagging — it's load-bearing for history accuracy.
- Don't hand-edit `src/lib/supabase/database.types.ts` — regenerate via `npm run db:types`.
