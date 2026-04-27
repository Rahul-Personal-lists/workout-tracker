# Workout Tracker

Mobile-first PWA for logging my 12-week program at the gym. Built with Next.js 16, Supabase, Tailwind v4.

## One-time setup

1. **Create a Supabase project** at https://supabase.com.
   - Auth → Email → enable Magic Link, disable password.
   - Auth → URL Configuration → add `http://localhost:3000/api/auth/callback` (and Vercel URL when deployed).

2. **Copy env vars**
   ```bash
   cp .env.local.example .env.local
   # fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
   ```

3. **Apply migrations** (Supabase CLI)
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-ref>
   npx supabase db push

   npx supabase db push     # applies 20260427100000_archive_exercises.sql
   npm run db:types         # regenerates database.types.ts
   ```

4. **Generate typed DB client**
   ```bash
   npm run db:types
   ```

5. **Seed the 12-week program for your user**
   ```bash
   npx tsx scripts/seed-program.ts you@example.com
   ```
   Creates the auth user (if missing) and inserts the program. Idempotent.

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
│   ├── (auth)/login/        # magic-link form
│   ├── (app)/               # auth-guarded routes (layout.tsx redirects to /login)
│   │   ├── today/
│   │   ├── workout/[sessionId]/   (Phase 2)
│   │   ├── program/
│   │   ├── history/         (Phase 3)
│   │   └── settings/
│   ├── api/auth/callback/   # Supabase OAuth code exchange
│   ├── layout.tsx
│   └── page.tsx             # → redirect to /today
├── components/bottom-nav.tsx
├── lib/
│   ├── progression.ts       # progressive-overload math
│   ├── utils.ts             # cn()
│   └── supabase/
│       ├── client.ts        # browser
│       ├── server.ts        # RSC / server actions
│       ├── middleware.ts    # session refresh
│       └── database.types.ts (generated)
├── middleware.ts            # auth gate for all (app) routes
supabase/
├── config.toml
├── migrations/20260426000000_init.sql
scripts/
└── seed-program.ts
```

## Phases

- ✅ **Phase 1** — Foundation (this commit)
- ⏳ **Phase 2** — Logging MVP (`/today`, `/workout/[id]`, server actions)
- ⏳ **Phase 3** — History (list, detail, per-exercise chart)
- ⏳ **Phase 4** — Polish (PWA manifest, offline queue, rest timer)
