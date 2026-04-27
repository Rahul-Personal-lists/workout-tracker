# Workout Tracker App — Build Spec

Build a mobile-first PWA for tracking my 12-week workout program. I'll use it on my phone at the gym.

## Manual Setup (Rahul does these once, before/during Phase 1)

Before code can run, the following must exist. Pause and ask Rahul to provide values when needed — don't invent placeholders.

1. **Supabase project**
   - Create a new project at https://supabase.com
   - Grab: `Project URL`, `anon` public key, `service_role` key (keep secret)
   - Enable Email auth → Magic Link only (disable password)
   - Set Site URL + Redirect URL to `http://localhost:3000` (dev) and the Vercel URL (prod)
2. **Local env file** (`.env.local`)
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```
3. **Supabase CLI** (for migrations + typegen)
   - `npm i -g supabase` (or use npx)
   - `supabase login`, `supabase link --project-ref <ref>`
4. **Vercel project** (defer until Phase 4) — link via `vercel` CLI when ready to deploy.

## Stack (use exactly these)

- **Framework:** Next.js 15 (App Router, TypeScript, src/ directory)
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Database:** Supabase (Postgres + Auth)
- **Server state:** TanStack Query v5
- **Client state:** Zustand (active workout session only)
- **Forms:** react-hook-form + Zod
- **Dates:** date-fns
- **Charts:** Recharts
- **PWA:** @ducanh2912/next-pwa (next-pwa fork, supports Next 15)
- **Hosting:** Vercel

## Auth

- Supabase Auth, **email magic link only** (no password)
- Single-user for now, but schema is multi-user from day one (RLS enforced)
- Middleware-protected routes under `(app)`

## Database Schema

Generate Supabase migrations for this schema. Enable RLS on all tables — users can only access their own rows.

```sql
programs (
  id uuid pk default gen_random_uuid()
  user_id uuid fk → auth.users not null
  name text not null
  weeks int not null
  deload_weeks int[] not null default '{}'
  created_at timestamptz default now()
)

program_days (
  id uuid pk
  program_id uuid fk on delete cascade
  day_number int not null      -- 1, 2, 3, 4
  label text not null          -- "Day 1"
  title text not null          -- "Upper — Strength"
  unique (program_id, day_number)
)

program_exercises (
  id uuid pk
  program_day_id uuid fk on delete cascade
  order_index int not null
  name text not null
  sets int not null
  base_reps int                -- nullable (plank, ab wheel)
  start_weight numeric         -- nullable (bodyweight)
  increment numeric not null default 0
  tracked boolean default false
  note text                    -- nullable ("per side", "45 sec hold")
)

workout_sessions (
  id uuid pk
  user_id uuid fk → auth.users not null
  program_day_id uuid fk not null
  week_number int not null check (week_number between 1 and 52)
  started_at timestamptz not null default now()
  ended_at timestamptz
  duration_seconds int generated always as (
    extract(epoch from (ended_at - started_at))::int
  ) stored
  notes text
)

set_logs (
  id uuid pk
  session_id uuid fk on delete cascade
  program_exercise_id uuid fk not null
  set_number int not null
  planned_weight numeric        -- snapshotted at log time
  planned_reps int
  actual_weight numeric
  actual_reps int
  completed boolean default false
  logged_at timestamptz default now()
  unique (session_id, program_exercise_id, set_number)
)
```

Add indexes:
- `set_logs (program_exercise_id, logged_at desc)` — for per-exercise history
- `workout_sessions (user_id, started_at desc)` — for history list

## Seed Data (my 12-week program)

Create a SQL seed file with this exact program. Deload weeks are 4, 8, 12.

```typescript
const PROGRAM = {
  name: "12-Week Hypertrophy",
  weeks: 12,
  deload_weeks: [4, 8, 12],
  days: [
    {
      day_number: 1, label: "Day 1", title: "Upper — Strength",
      exercises: [
        { name: "Barbell Bench Press",       sets: 4, base_reps: 5,  increment: 5,   start_weight: 65,   tracked: true  },
        { name: "Barbell Bent-Over Row",     sets: 4, base_reps: 5,  increment: 5,   start_weight: 60,   tracked: true  },
        { name: "Seated DB Overhead Press",  sets: 3, base_reps: 8,  increment: 2.5, start_weight: 45,   tracked: true  },
        { name: "Cable Row (close grip)",    sets: 3, base_reps: 10, increment: 5,   start_weight: 50,   tracked: false },
        { name: "EZ Bar Curl",               sets: 3, base_reps: 10, increment: 2.5, start_weight: 30,   tracked: false },
        { name: "Tricep Pushdown",           sets: 3, base_reps: 10, increment: 2.5, start_weight: 30,   tracked: false },
      ],
    },
    {
      day_number: 2, label: "Day 2", title: "Lower — Strength",
      exercises: [
        { name: "Barbell Back Squat",        sets: 4, base_reps: 5,  increment: 5,   start_weight: 65,   tracked: true  },
        { name: "Romanian Deadlift",         sets: 3, base_reps: 8,  increment: 5,   start_weight: 75,   tracked: true  },
        { name: "DB Reverse Lunge",          sets: 3, base_reps: 10, increment: 2.5, start_weight: 20,   tracked: false, note: "per side" },
        { name: "DB Hip Thrust",             sets: 3, base_reps: 12, increment: 5,   start_weight: 35,   tracked: false },
        { name: "Standing Calf Raises (DB)", sets: 4, base_reps: 15, increment: 5,   start_weight: 30,   tracked: false },
        { name: "Plank",                     sets: 3, base_reps: null, increment: 0, start_weight: null, tracked: false, note: "45 sec hold" },
      ],
    },
    {
      day_number: 3, label: "Day 3", title: "Upper — Hypertrophy",
      exercises: [
        { name: "Incline DB Press",          sets: 4, base_reps: 10, increment: 2.5, start_weight: 25,   tracked: false },
        { name: "Lat Pulldown",              sets: 4, base_reps: 10, increment: 5,   start_weight: 50,   tracked: false },
        { name: "Cable Fly",                 sets: 3, base_reps: 12, increment: 2.5, start_weight: 15,   tracked: false },
        { name: "Face Pulls",                sets: 3, base_reps: 15, increment: 2.5, start_weight: 20,   tracked: false },
        { name: "Hammer Curl",               sets: 3, base_reps: 12, increment: 2.5, start_weight: 20,   tracked: false },
        { name: "Overhead Tricep Extension", sets: 3, base_reps: 12, increment: 2.5, start_weight: 25,   tracked: false },
      ],
    },
    {
      day_number: 4, label: "Day 4", title: "Lower — Hypertrophy",
      exercises: [
        { name: "DB Good Morning",           sets: 3, base_reps: 12, increment: 2.5, start_weight: 20,   tracked: false },
        { name: "Bulgarian Split Squat",     sets: 3, base_reps: 10, increment: 2.5, start_weight: 20,   tracked: false, note: "per side, DB" },
        { name: "DB Lunges",                 sets: 3, base_reps: 12, increment: 2.5, start_weight: 20,   tracked: false, note: "per side" },
        { name: "DB Stiff-Leg Deadlift",     sets: 3, base_reps: 12, increment: 5,   start_weight: 35,   tracked: false },
        { name: "DB Hip Thrust",             sets: 3, base_reps: 12, increment: 5,   start_weight: 35,   tracked: false },
        { name: "Ab Wheel / Plank Variation",sets: 3, base_reps: 15, increment: 0,   start_weight: null, tracked: false },
      ],
    },
  ],
};
```

## Progressive Overload Logic (shared util)

Create `src/lib/progression.ts`:

```typescript
export function getPlannedWeight(
  startWeight: number | null,
  increment: number,
  weekNumber: number,
  deloadWeeks: number[]
): number | null {
  if (startWeight === null) return null;

  // Count progressing weeks before this one. Week 1 = baseline. Deload weeks don't add load.
  const progressWeeksBefore =
    (weekNumber - 1) - deloadWeeks.filter(d => d < weekNumber).length;
  const normalWeight = startWeight + increment * progressWeeksBefore;

  if (deloadWeeks.includes(weekNumber)) {
    return Math.round((normalWeight * 0.7) / 2.5) * 2.5;
  }
  return normalWeight;
}

export function getPlannedReps(
  baseReps: number | null,
  weekNumber: number,
  deloadWeeks: number[]
): number | null {
  if (baseReps === null) return null;
  if (deloadWeeks.includes(weekNumber)) return baseReps;
  if (weekNumber >= 9 && baseReps === 5) return 6;
  return baseReps;
}

export function getPhase(week: number): "Foundation" | "Build" | "Peak" {
  if (week <= 4) return "Foundation";
  if (week <= 8) return "Build";
  return "Peak";
}
```

## Routes

```
src/app/
├── (auth)/login/page.tsx           # magic link form
├── (app)/
│   ├── layout.tsx                  # auth guard, bottom nav
│   ├── today/page.tsx              # "Week 3, Day 2" card → start button
│   ├── workout/[sessionId]/page.tsx # ACTIVE LOGGING (most important screen)
│   ├── program/page.tsx            # browse 12-week plan
│   ├── history/
│   │   ├── page.tsx                # session list, newest first
│   │   ├── [sessionId]/page.tsx    # session detail
│   │   └── exercise/[id]/page.tsx  # Recharts line graph: weight over time
│   └── settings/page.tsx
└── api/auth/callback/route.ts      # Supabase magic link callback
```

## Server Actions

`src/app/actions/`:
- `startWorkout(programDayId, weekNumber)` → creates session, returns id
- `logSet(sessionId, programExerciseId, setNumber, actualWeight, actualReps, completed)` → upsert to set_logs
- `finishWorkout(sessionId, notes?)` → sets ended_at
- `getCurrentWeekAndDay()` → derives next workout from latest session

## The Logging Screen — Spec

This is the make-or-break UX. Spec it carefully:

1. **Header:** "Week 3 · Day 2 — Lower Strength" + elapsed timer (live, from started_at)
2. **Exercise cards** (vertical scroll, one per program_exercise):
   - Name + planned (e.g., "Barbell Squat · 4×5 @ 75 lbs")
   - Set rows: `[weight input] × [reps input] [✓ checkbox]`
   - Pre-fill weight/reps from planned values
   - Tapping ✓ marks set complete + saves optimistically
   - Show last session's actual weight as a small hint under the input
3. **Rest timer** (local only, Zustand): auto-starts when set marked complete, configurable 60/90/120/180s
4. **Bottom sticky bar:** "Finish workout" button → confirm → redirect to `/history/[id]`
5. **Inputs:** `inputMode="decimal"` for weight, `inputMode="numeric"` for reps. Large tap targets (min 44px).

## Offline Strategy

- TanStack Query with `persistQueryClient` + IndexedDB (`idb-keyval`)
- Server actions wrapped to queue writes when offline → flush on reconnect
- Active workout state in Zustand with `persist` middleware → survives reload
- Service worker caches `/workout/[id]` shell

## PWA Manifest

- Standalone display mode
- Theme color: black
- Icons: 192x192 and 512x512 (placeholder is fine, swap later)
- Start URL: `/today`

## History Views

- **List:** date, day title, duration, set count, total volume (sum of weight × reps)
- **Session detail:** all sets logged, planned vs actual, notes
- **Exercise progress:** Recharts LineChart of `actual_weight` over `logged_at`, grouped by `program_exercise_id`. Filter by exercise name.

## Build Order

Build in this order, commit after each phase, don't skip ahead:

1. **Phase 1 — Foundation:** Next.js scaffold, Supabase client (server + browser), migrations, seed, auth, middleware, bottom nav shell
2. **Phase 2 — Logging MVP:** `/today`, `startWorkout` action, `/workout/[id]` screen, `logSet` + `finishWorkout` actions. Get one full workout logged end-to-end before moving on.
3. **Phase 3 — History:** session list, session detail, per-exercise chart
4. **Phase 4 — Polish:** PWA manifest, offline queue, rest timer, install prompt

## Constraints / Preferences

- TypeScript strict mode on
- Server Components by default; Client Components only where needed (forms, timers, charts)
- Use Supabase typegen (`supabase gen types typescript`) — don't hand-write DB types
- Mobile-first Tailwind: design for 375px width, scale up
- Round all displayed numbers — no floating point artifacts in the UI

## Out of scope (don't build)

- Program editor UI (the seed is enough)
- Social/sharing features
- Apple Health / Google Fit sync
- RPE tracking
- Exercise video links

Start with Phase 1. Show migration files and seed before applying. Pause when env vars / Supabase project info is needed.
