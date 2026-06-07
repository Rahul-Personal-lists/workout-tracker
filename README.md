# Trainr

A mobile-first PWA for logging strength programs at the gym. Single user today, multi-user-ready (RLS on every table). Built with **Next.js 16** (App Router), **Supabase** (Postgres + Auth + Storage), and **Tailwind v4**.

Ships with a **21-program preset library** (browsable at `/program/library`) plus a blank-program builder, custom video exercises, and ★ favorites; up to 2 programs per user, one active.

## Architecture

Trainr is **one deployable web app** — the **Next.js PWA** on **Vercel** — backed by managed services: **Supabase** (Postgres + Auth + Storage), **Resend** (the weekly summary email), the public-domain **free-exercise-db** catalog/images, and two **GitHub Actions** crons (weekly digest + catalog refresh). There is no separate backend service: Server Components read through a server-only query layer and every mutation goes through a Zod-validated Server Action, with **RLS as the only tenant boundary**.

##### Context Diagram
![Context diagram](./docs/diagrams/context.png)

> 📐 Diagram source: [`docs/diagrams/context.puml`](./docs/diagrams/context.puml). For the container-level view, the data model, process walkthroughs, sequence diagrams, deployment, and the known-gaps section, see **[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)**.

### Core processes

See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for full walk-throughs and diagrams:

- [**Authentication**](./docs/ARCHITECTURE.md#3-authentication--request-lifecycle) — email → 6-digit OTP → `sb-*` cookies; one auth gate in `proxy.ts`.
- [**Workout logging**](./docs/ARCHITECTURE.md#6-workout-logging-flow) — RSC snapshots the plan, a client island owns live edits, finish is a two-phase commit.
- [**Progressive overload**](./docs/ARCHITECTURE.md#7-progressive-overload-model) — pure functions recompute planned load/reps per week (deloads, peak-taper).
- [**Progress & timezone**](./docs/ARCHITECTURE.md#8-progress--analytics--timezone-strategy) — store UTC, derive user-TZ date keys, pad ±1 day then re-filter.

## Docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system map + diagrams (auth flow, ER schema, workout logging, progression model, PWA, onboarding).
- [`docs/CODE_AUDIT.md`](docs/CODE_AUDIT.md) — prioritized findings backlog (what's fixed, what's deferred).
- [`CLAUDE.md`](CLAUDE.md) — conventions, invariants, and the "don't" list.

## One-time setup

1. **Create a Supabase project** at https://supabase.com.
   - Auth → Email → enable Magic Link / OTP, disable password.
   - Auth → URL Configuration → add `http://localhost:3000/api/auth/callback` (and the Vercel URL when deployed).

2. **Env vars**
   ```bash
   cp .env.local.example .env.local
   # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
   # (weekly email also needs RESEND_API_KEY, NEXT_PUBLIC_APP_URL, CRON_SECRET)
   ```

3. **Apply migrations + generate types** (Supabase CLI)
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-ref>
   npx supabase db push       # apply all migrations
   npm run db:types           # regenerate src/lib/supabase/database.types.ts
   ```

4. **Seed a program for your user** (idempotent — creates the auth user if missing)
   ```bash
   npx tsx scripts/seed-program.ts you@example.com
   ```

## Dev

```bash
npm run dev          # http://localhost:3000
npm run typecheck
npm run lint
```

## Project layout

```
src/
├── app/
│   ├── (auth)/login/                  email → 6-digit OTP
│   ├── (app)/                         auth-gated app shell
│   │   ├── program/                   hub: day pills, next-up, start/redo, switcher
│   │   ├── workout/[sessionId]/       active logging UI
│   │   ├── progress/                  analytics + month grid
│   │   ├── body/                      weight / measurements / photos
│   │   ├── history/[sessionId]/       planned-vs-actual + edit
│   │   ├── history/exercise/[id]/     per-exercise chart
│   │   └── settings/                  prefs hub + detail spokes
│   ├── actions/                       Zod-validated server actions (the only mutation path)
│   ├── api/auth/callback/             Supabase code exchange
│   ├── api/cron/weekly-summary/       Resend weekly email (cron)
│   └── manifest.ts                    PWA manifest
├── proxy.ts                           auth gate (Next 16's renamed middleware)
├── lib/
│   ├── queries.ts                     server-only read layer (pages never query Supabase directly)
│   ├── progression.ts                 progressive-overload math
│   ├── supabase/{client,server,middleware}.ts
│   └── …
└── components/                        shell + shared client components
supabase/migrations/                   20 migrations (see CLAUDE.md / ARCHITECTURE.md)
scripts/                               seed, OTP, catalog refresh, email preview
```

Two architecture rules: **reads** go through `lib/queries.ts` (`server-only`); **writes** go through Zod-validated server actions in `app/actions/`. There is no separate API layer, and **RLS is the only tenant boundary**.
