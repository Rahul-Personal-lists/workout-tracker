# Trainr — Architecture

A mobile-first PWA for logging strength programs at the gym. Single user today, multi-user-ready (RLS on every table). This document is the C4 **container**-level map of how the pieces fit together; for the one-level-up **context** view see the diagram below, and for day-to-day conventions and the "don't" list see [`CLAUDE.md`](../CLAUDE.md).

> Diagrams below are [Mermaid](https://mermaid.js.org/) and render on GitHub. If you're reading in a plain editor, the fenced ```mermaid``` blocks are the source.

## 0. System context

Who uses Trainr and what it depends on. (Source: [`diagrams/context.puml`](./diagrams/context.puml) — re-render with `java -jar plantuml.jar -charset UTF-8 -tpng docs/diagrams/context.puml`.)

![System context diagram](./diagrams/context.png)

The whole system is **one deployable web app** (the Next.js PWA on Vercel) plus managed third parties: **Supabase** (Postgres + Auth + Storage), **Resend** (weekly email), **free-exercise-db** (exercise catalog + reference images), and **GitHub Actions** (two scheduled crons). There is no separate backend service — see [§15 Deployment & operations](#15-deployment--operations).

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
        ST[("Storage<br/>'workout-photos' bucket<br/>photos + videos")]
        AU["Auth (magic-link / OTP)"]
    end

    RES["Resend (email)"]
    GHA["GitHub Actions<br/>(weekly-summary +<br/>catalog-refresh crons)"]
    FEDB["free-exercise-db<br/>(catalog + reference images)"]

    RC -->|navigations| SW -->|network-first HTML| Edge
    RC -->|"call action"| SA
    Browser -->|"request"| PX
    PX --> RSC
    RSC --> Q --> DB
    SA --> DB
    SA -->|signed URLs / upload| ST
    RC -->|"direct upload (photos / videos)"| ST
    RC -->|"reference pics (img)"| FEDB
    PX --> AU
    GHA -.->|"POST /api/cron/weekly-summary (Bearer)"| CR
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
    auth_users ||--o{ exercise_favorites : owns
    auth_users ||--o{ custom_exercises : owns
    custom_exercises ||--o{ program_exercises : "snapshot (nullable FK, set null)"

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
        text video_path "custom-exercise snapshot"
        text poster_path
        jsonb crop_rect "reframe window 0..1"
        numeric trim_start_seconds
        numeric trim_end_seconds
        numeric aspect_ratio
        text_array muscles "catalog muscle tags"
        uuid custom_exercise_id "nullable provenance FK"
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
    exercise_favorites {
        uuid user_id PK
        text exercise_slug PK "free-exercise-db catalog id"
        timestamptz created_at
    }
    custom_exercises {
        uuid id PK
        uuid user_id FK
        text name
        text video_path "exercise-videos/ prefix"
        text poster_path
        jsonb crop_rect "reframe window 0..1"
        numeric trim_start_seconds
        numeric trim_end_seconds
        numeric aspect_ratio
        text_array muscles "catalog muscle tags"
        text default_kind "reps|time"
        int default_sets
        int default_reps
        int default_seconds
        timestamptz archived_at
    }
```

**Load-bearing schema facts:**

- **`set_logs.planned_*` and `planned_seconds` are snapshotted at log time.** Changing the program later never rewrites history. The FK to `program_exercises` is **non-cascading** — you can't hard-delete an exercise once a log references it (hence soft-delete).
- **`workout_sessions.program_day_id` FK is non-cascading**, so `/history/[sessionId]` resolves day → parent program through the FK chain (`getSessionContext`) even for archived/inactive programs.
- **`duration_seconds` is a generated column**, redefined once (`pause_session.sql`) to subtract `total_paused_seconds`: `greatest(epoch(ended_at - started_at) - total_paused_seconds, 0)`.
- **`programs_one_active_per_user`** is a partial unique index (`user_id WHERE is_active AND archived_at IS NULL`). Every promotion path (`seedPresetProgram`, `createBlankProgram`, `setActiveProgram`, `archiveProgram`) **demotes the current active program first** in the same call, or the index rejects the write.
- **One private storage bucket** (`workout-photos`) holds four path families, RLS-gated on the first folder segment = `auth.uid()` (so videos under `exercise-videos/` are covered by the same policy):
  - `{uid}/{sessionId}/{uuid}.ext` — workout-finish photos
  - `{uid}/body/{date}/{uuid}.ext` — body progress photos
  - `{uid}/profile/{uuid}.ext` — avatar
  - `{uid}/exercise-videos/{customExerciseId}/...` — custom-exercise clip + poster (`VIDEO_BUCKET` in [`video-upload.ts`](../src/lib/video-upload.ts), same bucket constant). Served via short-lived **signed URLs**; `signCustomVideoUrl` re-signs on a mid-session 403.
- **Custom-exercise media is snapshotted onto `program_exercises`** at add time (`video_path`/`poster_path`/`crop_rect`/`trim_*`/`aspect_ratio`/`muscles`) — same principle as `image_url` and `planned_*`. `custom_exercise_id` is a *nullable provenance pointer only* (`on delete set null`); playback never depends on the library row still existing, so soft-deleting or editing a custom exercise leaves history intact. Reframe/trim are **non-destructive** metadata applied at playback (no re-encode).
- **`exercise_favorites` is keyed by catalog slug**, not a `program_exercises` FK — favorites are about *browsing the library*, so they survive program edits and aren't tied to any program instance. Custom (no-catalog) exercises have no stable slug and can't be favorited in v1.
- **Two RPCs** (atomic, to dodge read-compute-write races): `swap_day_order(p_day_a, p_day_b)` and `resume_session(session_id)`.

### Migration history

20 migrations, additive. Worth knowing:

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
| `20260529000000` body_measurements | `body_measurements` table — ⚠️ originally shared a timestamp with the next one |
| `20260529000001` settings_extras | profile gender/age/height/avatar/units/sound prefs (renamed from a duplicate `…000000`; reconciled on remote via `migration repair`) |
| `20260530000000` rest_skip_flag | `is_rest_skip` on `workout_sessions` (explicit rest-day-skip flag; retires the `duration_seconds = 0` sentinel) |
| `20260530120000` body_log_weight_optional | `body_logs.weight_lb` nullable + `num_nonnulls(...) > 0` CHECK |
| `20260604000000` exercise_favorites | `exercise_favorites` table (catalog-slug-keyed ★) |
| `20260606000000` custom_exercises | `custom_exercises` table + 8 snapshot columns on `program_exercises` (video/crop/trim/muscles + provenance FK) |

> ⚠️ The `20260501030916` / `20260501031002` `swap_day_order` files are empty `;` placeholders (the real fn is in `20260430`); the two `20260529000000` duplicate timestamps were reconciled by renaming the second to `20260529000001` and running `migration repair` on remote. Both are harmless on the already-applied DB but a hazard for fresh environments. See [`CODE_AUDIT.md`](./CODE_AUDIT.md) §Migrations and [§16 Known gaps & gotchas](#16-known-gaps--gotchas).

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

## 10. Exercise catalog, favorites & custom-exercise video

Three layers feed the "what exercise is this" experience. None is a separate service — all live inside the app.

```mermaid
flowchart TB
    subgraph catalog["Built-in catalog (static)"]
        JSON["public/data/exercises-catalog.json<br/>(free-exercise-db, public domain)"]
        IMG["reference pics<br/>/0.jpg start · /1.jpg end<br/>(ExerciseAnimation CSS flip)"]
    end
    subgraph fav["Favorites"]
        FAVT[("exercise_favorites<br/>PK (user_id, slug)")]
    end
    subgraph custom["Custom exercises (user video)"]
        CE[("custom_exercises<br/>library entry")]
        VID[("Storage: exercise-videos/")]
        SNAP["snapshot onto<br/>program_exercises"]
    end
    Browse["/program/exercises<br/>(body-map filter + ★ grid)"]
    Browse --> JSON
    Browse --> FAVT
    Browse --> CE
    CE -->|signed URL| VID
    CE -->|"add to day"| SNAP
    JSON --> IMG
```

- **Built-in catalog** — `public/data/exercises-catalog.json` from [`yuhonas/free-exercise-db`](https://github.com/yuhonas/free-exercise-db) (public domain), refreshed weekly by a GitHub Action ([§15](#15-deployment--operations)). Reference pics layer `/0.jpg` (start) + `/1.jpg` (end) with a CSS opacity flip (`ExerciseAnimation`) — no JS animation loop.
- **Favorites** — `exercise_favorites`, keyed by the catalog **slug** (`CatalogEntry.id`), toggled by `toggleFavorite` (idempotent, returns the resulting state for optimistic reconcile). Read via `getFavoriteSlugs()` (degrades to empty on error). Surfaced as a ★ filter in the `/program/exercises` grid.
- **Custom exercises** — a user uploads a short mp4 (`≤50 MB`, `≤30 s`), reframes (a normalized `crop_rect`) and trims (`trim_*`) it; reframe/trim are **non-destructive metadata** applied at playback via `cropStyle` (no re-encode). `createCustomExercise` validates paths sit under `{uid}/exercise-videos/{id}/` (defense-in-depth over storage RLS) and rolls back the uploaded objects if the row insert fails. Adding a custom exercise to a day **snapshots** its media + muscle tags onto `program_exercises`, so history keeps playing even after the library entry is soft-deleted (`archived_at`). Custom muscle tags feed the same `MUSCLE_REGIONS` map used by the badge + body-map filter.

> **Server actions:** `toggleFavorite` ([`actions/favorites.ts`](../src/app/actions/favorites.ts)); `createCustomExercise` / `deleteCustomExercise` (soft) / `signCustomVideoUrl` ([`actions/custom-exercise.ts`](../src/app/actions/custom-exercise.ts)).

---

## 11. PWA & service worker

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

## 12. Onboarding / tutorial state machine

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

## 13. Design system

Tokens in [`globals.css`](../src/app/globals.css) under Tailwind v4 `@theme`:

- **Surfaces** — `--color-surface` / `-hover` / `-subtle`
- **Borders** — `--color-border` / `-strong`
- **Foreground** — `--color-foreground` / `-muted` (single muted tier; the dark palette has no contrast headroom for a third)
- **Focus ring** — `--focus-ring-width` / `-offset` / `-color` (refs `--color-accent`)
- **Accent** — `--color-accent`, switched by `[data-theme]` across 5 themes (lime/sky/amber/violet/rose). The accent cookie is read SSR in the root layout to avoid FOUC.

Prefer `bg-surface` / `border-border` / `text-foreground-muted` over raw `neutral-*` in new code. Migration is per-screen; `/program`, `/progress`, bottom-nav are migrated, others partially. **Never hardcode accent/focus values** — reference the CSS vars so theme switching keeps working.

---

## 14. Key invariants & conventions (quick reference)

1. Reads → `queries.ts` (`server-only`); writes → Zod-validated `actions/*.ts`. No API layer.
2. RLS is the only tenant boundary; most writes carry no explicit `user_id`.
3. `set_logs.planned_*` are snapshotted at log time — don't change without flagging.
4. Promote a program → demote the current active one first (partial unique index).
5. `order_index` rewrites use a two-phase OFFSET pass (collision-safe even without a unique constraint).
6. Time: store UTC, derive user-TZ keys via `dateKeyInTz`, pad ±1 day then re-filter.
7. Rest-day skips are flagged by `workout_sessions.is_rest_skip`, not inferred from `duration_seconds`.
8. A11y baseline: pinch-zoom stays enabled, every interactive element gets a `:focus-visible` ring (via `--focus-ring-*`), bottom nav has `aria-label`/`aria-current`, skip-to-main link.

---

## 15. Deployment & operations

There is **one deployable unit** (the Next.js app) plus managed third parties. No `vercel.json`, no Dockerfile, no separate backend.

| Unit | Where | Trigger / cadence | Notes |
|---|---|---|---|
| **Trainr web app** | Vercel (Next.js 16, Turbopack build) | git push → Vercel deploy | The PWA + Server Components + Server Actions + the two `/api/*` routes. |
| **Supabase project** | Supabase cloud | always-on | Postgres + Auth + Storage. Migrations applied via `npx supabase db push`; types via `npm run db:types`. |
| **Weekly-summary cron** | GitHub Actions ([`weekly-summary.yml`](../.github/workflows/weekly-summary.yml)) | `0 2 * * 1` (Mon 02:00 UTC = Sun 7pm Vancouver) | `curl POST $APP_URL/api/cron/weekly-summary` with `Authorization: Bearer $CRON_SECRET`. The route re-checks the Sunday-evening window (skippable with `?force=1` / `workflow_dispatch`). |
| **Catalog-refresh cron** | GitHub Actions ([`refresh-exercise-catalog.yml`](../.github/workflows/refresh-exercise-catalog.yml)) | `0 3 * * 1` (Mon 03:00 UTC, 1h after the digest) | Runs `npm run refresh-catalog -- --no-db`, then opens a PR with the diff. Reads from upstream `free-exercise-db`; never writes the DB in CI. |

**Required secrets / env** (see [`.env.local.example`](../.env.local.example) for app vars; GitHub repo secrets `APP_URL` + `CRON_SECRET` for the crons): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`.

---

## 16. Known gaps & gotchas

Surfaced while documenting; tracked, not all fixed. The current prioritized backlog with severities lives in [`REFACTOR_PLAN.md`](./REFACTOR_PLAN.md) (see its Status block for what's shipped); [`CODE_AUDIT.md`](./CODE_AUDIT.md) is the superseded 2026-05-29 historical record; product-level deferrals are in [`CLAUDE.md`](../CLAUDE.md). The ones most likely to bite a maintainer:

- **Migration timestamp hazards (fresh envs only).** `20260501030916` / `20260501031002_swap_day_order.sql` are empty `;` no-ops (real fn is `20260430`); the two `20260529000000` files were reconciled to `…000000` / `…000001` and `migration repair`-ed on remote. Harmless on the applied DB, but **give fresh migrations distinct timestamps** going forward. (See [§5 Migration history](#migration-history).)
- **`peak_taper` rep cuts are 12-week-hardcoded.** Weight taper is week-relative but the rep cuts fire on absolute weeks 7/9/10/11 ([`progression.ts`](../src/lib/progression.ts)). On a non-12-week program the rep taper misaligns. Don't change the math without Rahul's sign-off — he has explicit weekly expectations.
- **Custom-exercise upload GC is deferred.** `deleteCustomExercise` is **soft-only** (the storage object may be shared with snapshotted `program_exercises`). An upload whose row insert fails is rolled back, but a never-referenced orphan from an abandoned flow is not garbage-collected. ([`actions/custom-exercise.ts`](../src/app/actions/custom-exercise.ts).)
- **Open signup.** `signInWithOtp` defaults `shouldCreateUser: true` — any email can self-provision an account. Acceptable for the single-user app; set `false` (or document open signup) before any real multi-user launch. ([`(auth)/login/page.tsx`](../src/app/(auth)/login/page.tsx), CODE_AUDIT SEC3.)
- **Client-trusted media types.** `isLikelyImage` / `isLikelyVideo` trust the client-supplied MIME/extension (no magic-byte check). Accepted risk at single-user scope. ([`photo-upload.ts`](../src/lib/photo-upload.ts) / [`video-upload.ts`](../src/lib/video-upload.ts).)
- **`manifest.ts` references a missing screenshot** (`/screenshot-narrow.png` not in the repo) → a 404 in the PWA manifest. Harmless; add the asset or drop the entry.
- **Per-screen token migration is partial.** `/workout/*`, `/history/*`, `/body`, `/settings` detail, `/login` still use raw `text-neutral-*` instead of the semantic design tokens ([§13](#13-design-system)). New code should use the tokens.

### Product-level deferrals (intentional)

- **No offline write queue** — decided to ship without it; revisit if the gym connection actually drops.
- **No "cancel session" UI** — `startWorkout` redirects to any open session instead of duplicating; an unwanted session sits `ended_at = null` until finished or deleted from history.
- **Mid-workout exercise-add affects future sessions only** — the active session won't pick up a newly added exercise.
- **Max 2 programs, no unarchive UI** — creating a 3rd is rejected; archive one first.
- **PWA shell-caching only** — no real offline data, no custom install prompt.
