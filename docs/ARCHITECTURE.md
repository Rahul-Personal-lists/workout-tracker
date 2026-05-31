# Trainr — Architecture

A mobile-first PWA for logging strength programs at the gym. Single user today, multi-user-ready (RLS on every table). This document is the map of how the pieces fit together; for day-to-day conventions and the "don't" list, see [`CLAUDE.md`](../CLAUDE.md).

> Diagrams below are [Mermaid](https://mermaid.js.org/) and render on GitHub. If you're reading in a plain editor, the fenced ```mermaid``` blocks are the source.

---

## 1. Stack at a glance

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16** (App Router, Turbopack) | ⚠️ Next 16 renamed `middleware.ts` → **`proxy.ts`**. Read `node_modules/next/dist/docs/` before assuming older idioms. |
| Language | TypeScript (strict), `src/` dir | `npm run typecheck` is clean. |
| UI | React 19 + **Tailwind v4** (`@theme`) | Hand-rolled primitives, no shadcn. `lucide-react` icons. |
| Data | **Supabase** Postgres + Auth (magic-link / OTP) | RLS on every table. `@supabase/ssr ^0.10` for cookie handling. |
| Validation | **Zod** | Every server-action input is parsed. |
| Charts | **Recharts** | Per-exercise progress, body trends, workout-count bars. |
| Client state | **Zustand** (persisted) | Rest timer + onboarding/tutorial only. |
| Email | **Resend** + `@react-email` | Weekly summary, triggered by GitHub-Actions cron. |
| PWA | Hand-rolled | `manifest.ts`, `public/sw.js`, prod-only SW registration. |

`TanStack Query` is in `package.json` but **unused** — RSC + server actions cover everything.

---

## 2. High-level architecture

```mermaid
flowchart TB
    subgraph Browser["📱 Browser / installed PWA"]
        SW["Service Worker<br/>(public/sw.js)"]
        RC["Client islands<br/>(forms, workout UI, charts, timers)"]
    end

    subgraph Edge["Next.js 16 runtime"]
        PX["proxy.ts → updateSession()<br/>auth gate + cookie refresh"]
        RSC["Server Components<br/>(pages)"]
        SA["Server Actions<br/>actions/*.ts (Zod-validated)"]
        Q["queries.ts<br/>(server-only read layer)"]
        CR["api/cron/weekly-summary<br/>(Bearer + window gate)"]
    end

    subgraph Supabase["Supabase"]
        DB[("Postgres<br/>RLS owner-scoped")]
        ST[("Storage<br/>'workout-photos' bucket")]
        AU["Auth (magic-link / OTP)"]
    end

    RES["Resend (email)"]

    RC -->|navigations| SW -->|network-first HTML| Edge
    RC -->|"call action"| SA
    Browser -->|"request"| PX
    PX --> RSC
    RSC --> Q --> DB
    SA --> DB
    SA -->|signed URLs / upload| ST
    RC -->|"direct upload (photos)"| ST
    PX --> AU
    CR --> DB
    CR --> RES
    RSC -.->|props| RC
```

**Two rules hold the system together:**

1. **Pages never query Supabase directly.** Reads go through [`src/lib/queries.ts`](../src/lib/queries.ts) (`import "server-only"`); writes go through Zod-validated server actions in [`src/app/actions/`](../src/app/actions). There is no REST/GraphQL layer.
2. **RLS is the only tenant boundary.** Most queries and mutations operate by row id with *no* explicit `user_id` filter — owner-scoped policies (`auth.uid() = user_id`, or `EXISTS`-joins up to `programs.user_id`) enforce isolation. This is intentional and load-bearing, not an oversight.

---

## 3. Authentication & request lifecycle

There is **one** auth gate: [`src/proxy.ts`](../src/proxy.ts) → `updateSession()` in [`src/lib/supabase/middleware.ts`](../src/lib/supabase/middleware.ts). (The `(app)` layout is presentational — it does **not** re-check auth.)

```mermaid
flowchart TD
    Req["Incoming request"] --> M{"proxy matcher<br/>(skips _next, static, sw.js, images)"}
    M -->|"static asset"| Pass["served directly"]
    M -->|"app route"| US["updateSession()"]
    US --> GU["supabase.auth.getUser()<br/>(re-validates token, may rotate cookies)"]
    GU --> Pub{"path in PUBLIC_PATHS?<br/>/login, /api/auth/, /api/cron/"}
    Pub -->|yes| Allow["pass through (refreshed cookies)"]
    Pub -->|no| Auth{"user present?"}
    Auth -->|no| Login["307 → /login"]
    Auth -->|yes, on /login| Prog["307 → /program"]
    Auth -->|yes| Allow
```

**Login flow** (OTP-code based, not link-click):

```mermaid
sequenceDiagram
    participant U as User
    participant L as /login (client)
    participant SB as Supabase Auth
    participant PX as proxy.ts
    U->>L: enter email
    L->>SB: signInWithOtp({ email })
    SB-->>U: 6-digit code email
    U->>L: enter code
    L->>SB: verifyOtp({ email, token, type:'email' })
    SB-->>L: sets sb-* cookies (client-side)
    L->>PX: window.location.href = '/program' (hard nav)
    Note over PX: proxy re-reads fresh cookies → authenticated
```

A second path exists for magic-link/PKCE: `GET /api/auth/callback?code=…` → `exchangeCodeForSession` → redirect to `?next` (default `/program`). The live UI uses code entry.

**Trust tiers** — two distinct Supabase clients:

| Client | Where | Scope |
|---|---|---|
| Cookie-bound anon | `client.ts` (browser), `server.ts` (RSC/actions), `middleware.ts` (proxy) | RLS-enforced as the logged-in user |
| Service-role admin | `weekly-summary.ts` `createAdminClient()`, `profile.ts` `deleteAccount` | Bypasses RLS; **server-only**, never shipped to the client. Cron route is guarded by a `CRON_SECRET` Bearer header. |

---

## 4. Route map

```mermaid
flowchart LR
    Root["/"] -->|redirect| Program
    subgraph auth["(auth)"]
        Login["/login"]
    end
    subgraph app["(app) — auth-gated"]
        Program["/program<br/>hub: day pills, next-up,<br/>start/redo, switcher"]
        ProgEdit["/program/edit"]
        ProgAdd["/program/add<br/>catalog search"]
        ProgNew["/program/new<br/>+ /new/custom (builder)"]
        Workout["/workout/[sessionId]<br/>active logging"]
        Progress["/progress<br/>analytics: stats, chart,<br/>muscle map, calendar"]
        Body["/body<br/>weight, measures, photos"]
        HistSession["/history/[sessionId]<br/>planned-vs-actual, edit"]
        HistExercise["/history/exercise/[id]<br/>per-exercise chart"]
        Settings["/settings<br/>+ profile/units/sounds/theme/help"]
    end
    Program --> Workout --> HistSession
    Program --> ProgEdit & ProgAdd & ProgNew
    Progress --> HistSession --> HistExercise
    api["/api/auth/callback<br/>/api/cron/weekly-summary"]
```

Bottom nav (4 tabs): **Program · Progress · Body · Settings**. Auto-hidden on `/workout/*` and `/program/edit` so the action footer isn't covered. There is **no `/today` route** (removed; `/program` absorbed it) and **no `/calendar`** (the month grid lives inside `/progress`).

---

## 5. Data model (ER)

All tables are RLS-owner-scoped. Soft-delete via `archived_at` on `programs`, `program_days`, `program_exercises`.

```mermaid
erDiagram
    auth_users ||--o| profiles : "1:1"
    auth_users ||--o{ programs : owns
    programs ||--o{ program_days : has
    program_days ||--o{ program_exercises : has
    auth_users ||--o{ workout_sessions : owns
    program_days ||--o{ workout_sessions : "FK (no cascade)"
    workout_sessions ||--o{ set_logs : has
    program_exercises ||--o{ set_logs : "FK (no cascade, snapshot)"
    workout_sessions ||--o{ workout_session_photos : has
    auth_users ||--o{ body_logs : owns
    body_logs ||--o{ body_log_photos : "composite FK"
    auth_users ||--o{ body_measurements : owns

    profiles {
        uuid user_id PK
        text display_name
        numeric goal_weight_lb
        text gender
        smallint age
        numeric height_cm
        text avatar_path
        text units "imperial|metric"
        smallint sound_lead_seconds
        smallint vibration_lead_seconds
    }
    programs {
        uuid id PK
        uuid user_id FK
        text name
        int weeks
        int_array deload_weeks
        bool is_active "partial-unique: 1 active"
        timestamptz archived_at
    }
    program_days {
        uuid id PK
        uuid program_id FK
        int day_number "unique per program"
        text label
        text title
        timestamptz archived_at
    }
    program_exercises {
        uuid id PK
        uuid program_day_id FK
        int order_index
        text name
        int sets
        int base_reps
        numeric start_weight
        numeric increment
        int progression_weeks "default 1"
        bool peak_taper
        text kind "reps|time"
        int target_seconds
        text image_url
        timestamptz archived_at
    }
    workout_sessions {
        uuid id PK
        uuid user_id FK
        uuid program_day_id FK
        int week_number
        timestamptz started_at
        timestamptz ended_at
        timestamptz paused_at
        int total_paused_seconds
        int duration_seconds "GENERATED minus paused"
        text notes
    }
    set_logs {
        uuid id PK
        uuid session_id FK
        uuid program_exercise_id FK
        int set_number
        numeric planned_weight "snapshot"
        int planned_reps "snapshot"
        numeric actual_weight
        int actual_reps
        int planned_seconds "snapshot"
        int actual_seconds
        bool completed
        timestamptz logged_at
    }
    workout_session_photos {
        uuid id PK
        uuid session_id FK
        uuid user_id FK
        text storage_path
    }
    body_logs {
        uuid user_id PK
        date log_date PK
        numeric weight_lb "nullable; >=1 metric required"
        int calories
        numeric body_fat_pct
    }
    body_measurements {
        uuid user_id PK
        date log_date PK
        text metric PK "chest|waist|hips|bicep|thigh"
        numeric value_cm
    }
    body_log_photos {
        uuid id PK
        uuid user_id FK
        date log_date
        text storage_path
    }
```

**Load-bearing schema facts:**

- **`set_logs.planned_*` and `planned_seconds` are snapshotted at log time.** Changing the program later never rewrites history. The FK to `program_exercises` is **non-cascading** — you can't hard-delete an exercise once a log references it (hence soft-delete).
- **`workout_sessions.program_day_id` FK is non-cascading**, so `/history/[sessionId]` resolves day → parent program through the FK chain (`getSessionContext`) even for archived/inactive programs.
- **`duration_seconds` is a generated column**, redefined once (`pause_session.sql`) to subtract `total_paused_seconds`: `greatest(epoch(ended_at - started_at) - total_paused_seconds, 0)`.
- **`programs_one_active_per_user`** is a partial unique index (`user_id WHERE is_active AND archived_at IS NULL`). Every promotion path (`seedPresetProgram`, `createBlankProgram`, `setActiveProgram`, `archiveProgram`) **demotes the current active program first** in the same call, or the index rejects the write.
- **One private storage bucket** (`workout-photos`) holds three path families, RLS-gated on the first folder segment = `auth.uid()`:
  - `{uid}/{sessionId}/{uuid}.ext` — workout-finish photos
  - `{uid}/body/{date}/{uuid}.ext` — body progress photos
  - `{uid}/profile/{uuid}.ext` — avatar
- **Two RPCs** (atomic, to dodge read-compute-write races): `swap_day_order(p_day_a, p_day_b)` and `resume_session(session_id)`.

### Migration history

16 migrations, additive. Worth knowing:

| Migration | What it adds |
|---|---|
| `20260426` init | 5 core tables, RLS, indexes, generated `duration_seconds` |
| `20260427` ×3 | `image_url`; `archived_at` on exercises; `workout_session_photos` + `body_logs` + storage bucket |
| `20260428` programs_editing | `is_active` + `archived_at` on programs, `archived_at` on days, partial unique index |
| `20260430` + two empty | `swap_day_order` RPC (two later same-name files are **empty no-ops**) |
| `20260502` profiles | `profiles` (display_name) |
| `20260503` progression_weeks | per-exercise `progression_weeks` (1–8) |
| `20260504` pause_session | `paused_at`, `total_paused_seconds`, redefined `duration_seconds`, `resume_session()` |
| `20260516` cardio | `kind`/`target_seconds` + `planned_seconds`/`actual_seconds` + cardio backfill |
| `20260519` peak_taper | `peak_taper` boolean |
| `20260528` body_goals_and_photos | `goal_weight_lb`, `body_fat_pct`, `body_log_photos` |
| `20260529` ×2 | `body_measurements` table **and** profile/settings columns — ⚠️ **share the same timestamp** |

> ⚠️ Two migrations carry `20260529000000` and two are empty `;` placeholders. See [`CODE_AUDIT.md`](./CODE_AUDIT.md) §Migrations. They're harmless on the already-applied DB but a hazard for fresh environments.

---

## 6. Workout logging flow

The most stateful screen. A server component snapshots the plan; a client island owns all live edits.

```mermaid
sequenceDiagram
    actor U as User
    participant P as page.tsx (RSC)
    participant Q as queries.ts
    participant WC as WorkoutClient
    participant EC as ExerciseCard / SetRow
    participant A as actions/workout.ts
    participant DB as Supabase

    P->>Q: getSession, getSessionLogs, getLastSessionHints,<br/>getPreviousDayNote, getUnitsServer (parallel)
    Note over P: compute planned_* via progression.ts<br/>merge with existing logs → ExerciseRow[]
    P->>WC: ExerciseRow[] (initial state)
    U->>EC: edit weight/reps or toggle "done"
    EC->>WC: onChange(setNumber, patch, persist)
    WC->>WC: optimistic local update
    WC->>A: logSet({...planned snapshot, actual, completed})
    A->>DB: upsert set_logs (session, exercise, set_number)
    Note over WC: mark complete → start rest timer (Zustand)
    U->>WC: Finish
    WC->>A: finishWorkout (stamps ended_at once, updates notes)
    WC->>DB: direct photo upload to storage
    WC->>A: recordSessionPhotos(paths)
    WC->>U: redirect /history/[sessionId]
```

**Three independent timers** coexist (don't conflate them):

| Timer | Where | Persists across nav? |
|---|---|---|
| Rest timer | Zustand store (`stores/rest-timer.ts`), dual-mount `RestTimerBar` | ✅ yes (localStorage) |
| Per-set time-attack countdown | local state in `TimeSetInputRow` | ❌ no — lost on unmount |
| Elapsed-session clock | `useState` in `WorkoutClient` (1s interval) | n/a (recomputed from `started_at`) |

Finish is a **two-phase commit**: `finishWorkout` first (durable `ended_at` + notes, idempotent), then best-effort photo upload + `recordSessionPhotos`. Photo failure keeps the workout saved and offers retry/skip.

> A mid-workout drag-reorder writes `program_exercises.order_index` via `setExerciseOrder` — it **permanently changes the program**, not just this session. The merge-under-drift logic keeps a mid-workout-added exercise from being dropped.

---

## 7. Progressive overload model

Lives in [`src/lib/progression.ts`](../src/lib/progression.ts). Pure functions, recomputed at render time in 4 RSC pages (workout, history detail, program, program/edit). **This is not the same as `set_logs.planned_*`**, which are snapshotted at log time.

```mermaid
flowchart TD
    W["weekNumber"] --> D{"deload week?"}
    D -->|no| Lin["start_weight + increment ×<br/>floor(nonDeloadWeeksBefore / progression_weeks)"]
    D -->|yes| F{"peakTaper OR<br/>final multi-deload?"}
    F -->|yes| RT["retest: recurse to (prevDeload + 1)<br/>— a work week"]
    F -->|no| BO["back-off: 70% of linear ramp,<br/>snapped to increment steps,<br/>capped 1 step below prev work week"]
    Reps["getPlannedReps"] --> R1["W≥9 & base=5 → 6 reps"]
    Reps --> R2["peakTaper: W7=-2, W9=-2,<br/>W10=-4, W11=-6 (12-wk only)"]
```

- Week 1 = baseline; each non-deload week adds `increment` (paced by `progression_weeks`).
- Deload = 70% back-off, **except** the final deload of a multi-deload program and `peak_taper` exercises, which *retest* the previous block's peak.
- `getPlannedSeconds` is a passthrough (time exercises don't progress).

> ⚠️ `peak_taper` rep cuts are hardcoded to weeks 7/9/10/11 (12-week assumption) while the weight taper is week-relative. See [`CODE_AUDIT.md`](./CODE_AUDIT.md). **Don't change this math without flagging** — Rahul has explicit weekly expectations.

---

## 8. Progress / analytics & timezone strategy

`/progress` is read-only. The spine is a pure window function.

```mermaid
flowchart LR
    SP["searchParams<br/>range + anchor"] --> PR["parseRange / parseAnchor"]
    PR --> LO["Last tab? → getLatestSessionDateKey(tz)"]
    LO --> CW["computeProgressWindow<br/>→ startKey, endKey, buckets, label, prev/next"]
    CW --> GP["getProgressForRange"]
    GP --> S1["fetch sessions in ±1-day UTC window"]
    S1 --> RF["re-filter by dateKeyInTz into [startKey,endKey]"]
    RF --> S2["fetch set_logs for surviving session ids"]
    S2 --> AGG["totals + per-bucket counts + muscle-group tallies"]
```

**Timezone invariant** (the thing that makes calendar math correct regardless of server TZ):

- DB stores UTC. A client-set `tz` cookie (`tz-init.tsx`) drives `dateKeyInTz` (Intl `en-CA` → `YYYY-MM-DD`).
- Range queries **pad ±1 UTC day** then **re-filter in JS** by the user-TZ date key. All calendar arithmetic uses UTC-midnight `Date` carriers as a TZ-neutral spine.
- A session counts as "activity" when it's **not a rest-day skip** (`is_rest_skip = false`). Rest-day skips are written by `skipRestDay` with `is_rest_skip = true` and excluded from streaks/progress/calendar. *(Earlier this was inferred from `duration_seconds = 0`, which could collide with a real zero-duration workout — replaced by the explicit `is_rest_skip` column in migration `20260530000000`.)*

Muscle map: `exercises-catalog.json` primary muscles → `CATALOG_TO_TOP_LEVEL` (8 groups) → `MUSCLE_TO_GROUP` (vendored `react-body-highlighter` polygons) → SVG heat overlay (opacity scales by set count).

---

## 9. Body tracking

Canonical units in the DB: **lb** (weight), **cm** (circumference). Conversion happens only at the edge, driven by the `units` cookie + `MetricConfig` registry (`body-metrics.ts`).

- **Two separate tables**: `body_logs` (one row/day shared by weight + bodyfat + calories; any one of them is enough — a `num_nonnulls(...) > 0` CHECK just forbids a fully empty row) and `body_measurements` (circumferences, decoupled so a tape-measure day needs no weigh-in).
- **Two photo systems share one bucket**: `workout_session_photos` (per session) and `body_log_photos` (per body-log date, composite FK requires a `body_logs` row first).
- Trend math (`body-stats.ts`): EMA smoothing (α by range), 7-day average, weekly rate from the EMA tail, linear goal-date projection (null unless trending toward goal).

---

## 10. PWA & service worker

```mermaid
flowchart TD
    F["fetch event (GET, same-origin)"] --> Auth{"/login or /api/auth/*?"}
    Auth -->|yes| Bypass["bypass SW → network"]
    Auth -->|no| HTML{"Accept: text/html?"}
    HTML -->|yes| NF["network-first (SHELL_CACHE)<br/>cache only same-path non-redirected 200s"]
    HTML -->|no| Static{"/_next/static/*?"}
    Static -->|yes| CF["cache-first (STATIC_CACHE)"]
    Static -->|no| Net["passthrough"]
```

- **HTML is network-first** so a deploy never serves a stale shell referencing purged `/_next` chunk hashes (which would 404 and break client nav). The cache is the offline fallback only.
- **Hashed static assets are cache-first** (immutable URLs).
- Auth paths bypass the SW so cookies/redirects always reach the network. HTML is only cached when the final URL path matches the request path — prevents a login-redirect from poisoning a page's cache key.
- `VERSION = "v4"` gates cache cleanup on `activate`. SW registers **in production only**.

---

## 11. Onboarding / tutorial state machine

```mermaid
stateDiagram-v2
    [*] --> FreshUser
    FreshUser --> PickerOpen : on /program, !pickerSeen
    PickerOpen --> TourRunning : start(tour) → autoStart, navigate
    TourRunning --> TourRunning : next()/prev() across data-tour targets
    TourRunning --> TourSeen : last next() → hasSeen=true, clear autoStart
    TourSeen --> PickerOpen : other tour still unseen
    TourSeen --> Redirect : both tours seen → dismiss picker → /settings
    Redirect --> [*]
```

State in `stores/tutorial.ts` (Zustand + persist, `version=3` with a `migrate()` chain). Only `pickerSeen` + per-tour `hasSeen` persist; `step`/`autoStart` are ephemeral (`partialize`) so a mid-tour reload can't resurrect an auto-fire. Replayable from Settings → Help.

---

## 12. Design system

Tokens in [`globals.css`](../src/app/globals.css) under Tailwind v4 `@theme`:

- **Surfaces** — `--color-surface` / `-hover` / `-subtle`
- **Borders** — `--color-border` / `-strong`
- **Foreground** — `--color-foreground` / `-muted` (single muted tier; the dark palette has no contrast headroom for a third)
- **Focus ring** — `--focus-ring-width` / `-offset` / `-color` (refs `--color-accent`)
- **Accent** — `--color-accent`, switched by `[data-theme]` across 5 themes (lime/sky/amber/violet/rose). The accent cookie is read SSR in the root layout to avoid FOUC.

Prefer `bg-surface` / `border-border` / `text-foreground-muted` over raw `neutral-*` in new code. Migration is per-screen; `/program`, `/progress`, bottom-nav are migrated, others partially. **Never hardcode accent/focus values** — reference the CSS vars so theme switching keeps working.

---

## 13. Key invariants & conventions (quick reference)

1. Reads → `queries.ts` (`server-only`); writes → Zod-validated `actions/*.ts`. No API layer.
2. RLS is the only tenant boundary; most writes carry no explicit `user_id`.
3. `set_logs.planned_*` are snapshotted at log time — don't change without flagging.
4. Promote a program → demote the current active one first (partial unique index).
5. `order_index` rewrites use a two-phase OFFSET pass (collision-safe even without a unique constraint).
6. Time: store UTC, derive user-TZ keys via `dateKeyInTz`, pad ±1 day then re-filter.
7. Rest-day skips are flagged by `workout_sessions.is_rest_skip`, not inferred from `duration_seconds`.
8. A11y baseline: pinch-zoom stays enabled, every interactive element gets a `:focus-visible` ring (via `--focus-ring-*`), bottom nav has `aria-label`/`aria-current`, skip-to-main link.

---

## 14. Known limitations

Tracked in [`CLAUDE.md`](../CLAUDE.md) (offline write queue deferred, no cancel-session UI, mid-workout exercise-add only affects future sessions, max 2 programs, PWA shell-caching only) and the prioritized findings in [`CODE_AUDIT.md`](./CODE_AUDIT.md).
