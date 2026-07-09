# Startup & navigation speed — design

**Date:** 2026-07-08 · **Branch:** `feat/startup-speed` (off `main`) · **One PR.**
Scope agreed with Rahul: quick wins + perceived-speed polish (his options 1+2). No refactor tier.

## Problem

Cold-opening the app on the phone "takes a bit", and switching between screens
(bottom tabs, day pills, history taps) feels slow. Applies to the browser
PWA today and equally to the Capacitor shell (PR #114), whose webview loads
the same deployed app.

## Diagnosis (from code + build output, 2026-07-08)

1. **Everything is dynamic.** `next build` shows zero prerendered routes — the
   root layout awaits `cookies()` for the accent theme, making the whole tree
   request-rendered. Every navigation = phone → Vercel function (us-east)
   roundtrip (~100–300 ms RTT from Vancouver LTE) + render time.
2. **`/program` query waterfall** ([page.tsx](../../../src/app/(app)/program/page.tsx)):
   `reapStaleSession` (2 serial queries) → `Promise.all` of 5 → second wave
   where `getNextWorkout` runs 2 more queries serially; `attachMediaUrls`
   signs posters then videos serially. ≈6 sequential DB roundtrips before the
   page section can stream.
3. **`/workout/[sessionId]`** is 3 waves: `getSession` → `getCurrentProgram`
   (independent of each other) → `Promise.all` of 5.
4. **`/progress`** serially awaits `getLatestSessionDateKey` (Last tab) before
   its main `Promise.all`, then `getSessionsByDateForMonth` after it.
5. **Dynamic client cache is off** (Next default `staleTimes.dynamic = 0`):
   day-pill/week/range taps (searchParams variants) and tab re-visits hit the
   server every time, even seconds apart. Bottom-nav `prefetch` (=true) already
   full-prefetches the 4 tabs with a 5-min TTL, but every mutation's
   `revalidatePath` purges it and searchParams variants aren't covered.
6. **No `loading.tsx`** for `/history/[sessionId]`, `/history/exercise/[id]`,
   `/program/library` (all 3 levels), `/program/exercises`,
   `/program/exercises/new` — those taps freeze the current screen until the
   server responds (reads as "app is stuck").
7. **Signed media URLs are re-minted every render** (`createSignedUrls` in
   [queries.ts](../../../src/lib/queries.ts)) — the URL's token changes each
   time, so the browser re-downloads custom-exercise posters, avatars, and
   photos it already has.
8. **Recharts is statically imported** by `progress-bar-chart.tsx`,
   `body-chart.tsx`, `exercise-chart.tsx` — ~100 KB extra JS parsed before
   those routes hydrate on a phone CPU.
9. **No preconnect** to `raw.githubusercontent.com` (catalog exercise images)
   or the Supabase origin (signed media), so first image loads pay
   DNS+TLS setup.

Not problems: middleware auth is a local JWT verify (no auth-server roundtrip);
Supabase is AWS us-east-1 which matches Vercel's default `iad1`; `/body` is
already a single parallel wave.

## Goals / non-goals

**Goals:** faster first paint on cold open; screen switches that respond within
a frame (cache hit or skeleton); fewer sequential roundtrips per page; browser
image cache that actually works. Zero behavior/data-semantics changes.

**Non-goals:** offline support, Cache Components/PPR, service-worker strategy
changes, TanStack Query, restructuring the theme cookie, anything in `mobile/`.

## Design

### A. Client navigation cache (config-only)

`next.config.ts`:

```ts
experimental: {
  optimizePackageImports: [...unchanged],
  staleTimes: { dynamic: 30, static: 300 },
}
```

Dynamic page segments (incl. searchParams variants — day pills, week chevrons,
progress range tabs) are reused from the client cache for 30 s; loading
boundaries become reusable for the static period. Server actions still call
`revalidatePath`, which invalidates the client cache immediately, so the app's
own mutations stay fresh. Staleness window applies only to changes made
elsewhere (other device) — acceptable for a single user. Experimental config:
one-line revert if a Next upgrade changes it.

### B. Query waterfall collapse

**`/program` page** — restructure to two waves:

- Wave 1 (parallel): `reapStaleSession(supabase, userId)`, `getCurrentProgram()`,
  `getAllPrograms()`, `getUnitsServer()`, `getTodayWeightLb()`, `getGoalWeight()`.
  Safe because reap touches only `workout_sessions`/`set_logs`, which nothing
  in wave 1 reads.
- Wave 2 (parallel, after wave 1 — **ordering constraint: these read
  `workout_sessions`, so reap must have resolved**): `getNextWorkout(program)`,
  `getCompletedSlots(program)`, `getUndoableSkip()`. A code comment records the
  constraint.
- Inside `getNextWorkout`: fire the in-progress and last-finished session
  queries with `Promise.all` (decision logic unchanged — in-progress still wins).
- Inside `attachMediaUrls`: sign posters and videos with `Promise.all`.

Longest chain ≈6 roundtrips → ≈3 (reap's 2 internal + wave 2).

**`/workout/[sessionId]`** — `getSession` and `getCurrentProgram` run in
parallel; the notFound/redirect guards run after both resolve. 3 waves → 2.

**`/progress`** — one `Promise.all` for `getProgressForRange`, `getWeekStreak`,
`getUnitsServer`, and (when range is month/year) `getSessionsByDateForMonth`.
The Last tab keeps a 2-wave shape because its window derives from
`getLatestSessionDateKey`. 3 waves → 1 (2 for Last).

No changes to what is fetched or returned — only when queries start.

### C. Skeletons + tap feedback

- New `loading.tsx` (to the standard of the existing
  [program/loading.tsx](../../../src/app/(app)/program/loading.tsx): layout-matched
  blocks, `aria-busy`, `animate-pulse` on `bg-surface-subtle`) for:
  `/history/[sessionId]`, `/history/exercise/[id]`, `/program/library`,
  `/program/library/[programId]`, `/program/library/[programId]/[dayId]`,
  `/program/exercises`, `/program/exercises/new`.
- `useLinkStatus` pending indicators (opacity/pulse on the tapped element,
  ~100 ms animation-delay so instant navs never flash) on: day pills
  (`day-tabs.tsx`), progress month-grid day links (`month-grid.tsx`), and
  range tabs (`range-tabs.tsx`).

### D. Media caching

- New `src/lib/signed-url-cache.ts`: `getSignedUrls(supabase, bucket, paths,
  ttlSeconds)` — module-scope `Map<"bucket:path", { url, expiresAtMs }>`.
  Returns the cached URL while >25 % of TTL remains; batch-signs only misses
  via one `createSignedUrls` call; preserves input order; bounded (evict oldest
  entries past 1,000). Per-instance memory — cold instances just re-sign.
  Stable URLs across renders ⇒ browser image cache hits for posters, videos,
  avatars, session/body photos.
- Swap call sites in `queries.ts` (`attachMediaUrls`, `getCustomExercises`,
  `getSessionPhotos`, `getBodyPhotos`, `getProfile` avatar) to use it.
  Signed-URL TTLs and RLS semantics unchanged.
- Root layout: `<link rel="preconnect">` to `https://raw.githubusercontent.com`
  and the `NEXT_PUBLIC_SUPABASE_URL` origin (both `crossOrigin="anonymous"`;
  React 19 hoists resource links into `<head>`).

### E. Code-split the charts

Wrap the three Recharts components in `next/dynamic` (`ssr: false`) behind
thin `"use client"` lazy wrappers with fixed-height skeleton fallbacks matching
the current chart container heights (no layout shift): `progress-bar-chart`,
`body-chart`, `exercise-chart`. Routes hydrate before the chart chunk arrives;
the chart pops in a beat later.

### F. Rahul's Vercel dashboard checklist (not code)

1. **Fluid Compute ON** for the workout-tracker project (biggest cold-start lever).
2. **Function region** = default `iad1`/us-east (Supabase is us-east-1; a
   mismatch would tax every query).
3. **Deployment Protection OFF** for production (already owed for the APK) —
   also unblocks before/after measurements on prod.

## Rejected alternatives (recorded so they aren't re-pitched)

- **Cache Components / PPR + `unstable_instant`** — real instant-shell wins,
  but the app is ~100 % per-user data so the delta over skeletons+staleTimes is
  modest, it requires moving the theme cookie out of the root layout, and the
  Expo rewrite (docs/MOBILE_ROADMAP.md) supersedes it. Parked, not planned.
- **Service-worker HTML caching (stale-while-revalidate)** — instant cold paint
  but risks stale HTML referencing purged `/_next/static` hashes (the exact
  hazard `public/sw.js` documents); offline was explicitly deferred. No change.
- **TanStack Query client cache** — still no use case; server actions + RSC
  remain the pattern.
- **Theme-cookie restructure to re-enable static prerendering** — only pays off
  under PPR; not worth churn now.

## Risks

- `staleTimes` is experimental — config-only, trivially removable; behavior
  verified in production mode before shipping.
- 30 s staleness across devices — single-user app, accepted.
- Signed-URL memo holds URLs in function memory — bounded map, TTLs unchanged,
  worst case (cold instance) equals today's behavior.
- Reap-in-wave-1 reordering — reviewed table dependencies; wave 2 (the session
  readers) still strictly follows reap. Guarded by comment + live verification.
- `ssr: false` charts render a skeleton on first server paint — accepted (charts
  are client-measured anyway; fixed-height fallback prevents CLS).

## Verification

- `npm run typecheck`, `npm run lint`, `npm run build` green.
- New smoke test `scripts/smoke-signed-url-cache.ts` (fake signer counting
  calls): memo hit within TTL, refresh near expiry, batch with partial misses
  preserves order, eviction bound.
- Live preview on the **test account** (`scripts/test-otp.ts` + Playwright)
  against a local **production** server (`next build && next start` — prefetch
  and staleTimes are prod-only):
  - day-pill hop and tab re-visit within 30 s: no network RSC fetch (instant);
  - history/month-grid tap: skeleton visible immediately;
  - two consecutive `/program` renders: identical signed poster URLs;
  - zero console errors.
- Before/after timing: Playwright navigation timings on the same flows against
  `next start`, plus prod TTFB via curl once Deployment Protection is off.

## Rollout

Single PR from `feat/startup-speed`; no migrations; no `mobile/` changes;
independent of PR #114 (either merges first). PR title:
`⚡ Faster startup and screen switches` (no ticket).
