# Trainr

A mobile-first PWA for logging strength programs at the gym. Single user today, multi-user-ready (RLS on every table). Built with **Next.js 16** (App Router), **Supabase** (Postgres + Auth), and **Tailwind v4**.

Ships with 4 preset templates (12-week strength, PPL, Upper/Lower, Full Body 3×) and a blank-program builder; up to 2 programs per user, one active.

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
supabase/migrations/                   16 migrations (see CLAUDE.md / ARCHITECTURE.md)
scripts/                               seed, OTP, catalog refresh, email preview
```

Two architecture rules: **reads** go through `lib/queries.ts` (`server-only`); **writes** go through Zod-validated server actions in `app/actions/`. There is no separate API layer, and **RLS is the only tenant boundary**.
