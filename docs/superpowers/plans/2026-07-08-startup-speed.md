# Startup & Navigation Speed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut cold-open time and make screen switches respond within a frame (cache hit or skeleton), per [the spec](../specs/2026-07-08-startup-speed-design.md).

**Architecture:** Config-level client caching (`staleTimes`), query-wave collapse on `/program`, `/workout`, `/progress`, an injected-signer memo for Supabase signed URLs, route skeletons + `useLinkStatus` feedback, lazy Recharts. No data-semantics changes, no migrations, nothing in `mobile/`.

**Tech Stack:** Next.js 16.2.4 App Router (Turbopack), @supabase/ssr, Tailwind v4 tokens, `npx tsx` smoke scripts.

## Global Constraints

- Branch `feat/startup-speed`; commit style `type: subject` (50/72), one commit per task.
- Design tokens only (`bg-surface`, `border-border`, `text-foreground-muted`, `bg-surface-subtle`) — no raw `neutral-*` in new code.
- Comments only for non-obvious "why"; naming covers "what".
- Signed-URL TTLs unchanged: `VIDEO_URL_TTL` (6 h) for posters/videos, `60 * 60` (1 h) for photos/avatar.
- `signCustomVideoUrl` (mid-session 403 recovery) stays **uncached** — it exists to mint a fresh URL.
- Don't touch: progression math, `planned_*` snapshotting, `database.types.ts`, `public/sw.js`, `mobile/`.
- Windows: pass `C:/Users/...`-form paths to node/tsx in inline scripts.
- Verification gate per task: `npm run typecheck` green (lint/build in Task 11).

---

### Task 1: staleTimes config

**Files:**
- Modify: `next.config.ts`

**Interfaces:** none (config only).

- [x] **Step 1: Add staleTimes**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "recharts"],
    staleTimes: { dynamic: 30, static: 300 },
  },
};

export default nextConfig;
```

- [x] **Step 2: Verify config parses**

Run: `npm run typecheck` → 0 errors. (Behavioral check happens in Task 11 against `next start` — prefetch/cache are prod-only.)

- [x] **Step 3: Commit**

`git commit -m "perf: enable 30s client router cache for dynamic pages"`

---

### Task 2: signed-url memo cache (TDD)

**Files:**
- Create: `src/lib/signed-url-cache.ts`
- Test: `scripts/smoke-signed-url-cache.ts`

**Interfaces:**
- Produces: `getSignedUrlsCached(opts: { bucket: string; paths: string[]; ttlSeconds: number; sign: SignBatch; now?: () => number }): Promise<(string | null)[]>` where `type SignBatch = (paths: string[], ttlSeconds: number) => Promise<(string | null)[]>`; plus `clearSignedUrlCache(): void` (tests only). Task 3 consumes `getSignedUrlsCached`.
- **No `import "server-only"`** — signer is injected so the smoke script can run it under plain `tsx` (same pattern as `day-order.ts`).

- [x] **Step 1: Write the failing smoke test**

`scripts/smoke-signed-url-cache.ts` — self-contained runner in the house style (numbered cases, non-zero exit on failure):

```ts
import {
  clearSignedUrlCache,
  getSignedUrlsCached,
} from "../src/lib/signed-url-cache";

let failures = 0;
let caseNo = 0;
function check(name: string, cond: boolean) {
  caseNo += 1;
  if (cond) console.log(`ok ${caseNo} - ${name}`);
  else {
    failures += 1;
    console.error(`FAIL ${caseNo} - ${name}`);
  }
}

function makeSigner() {
  const calls: string[][] = [];
  return {
    calls,
    sign: async (paths: string[]) => {
      calls.push([...paths]);
      return paths.map((p) => (p === "missing" ? null : `signed:${p}:${calls.length}`));
    },
  };
}

async function main() {
  const TTL = 100; // seconds
  let nowMs = 1_000_000;
  const now = () => nowMs;

  // 1–2: first call signs everything, in order
  clearSignedUrlCache();
  const s1 = makeSigner();
  const first = await getSignedUrlsCached({
    bucket: "b",
    paths: ["a", "c"],
    ttlSeconds: TTL,
    sign: s1.sign,
    now,
  });
  check("first call returns urls in input order", first[0] === "signed:a:1" && first[1] === "signed:c:1");
  check("first call hits the signer once", s1.calls.length === 1);

  // 3–4: second call inside the fresh window is a pure memo hit
  const second = await getSignedUrlsCached({
    bucket: "b",
    paths: ["a", "c"],
    ttlSeconds: TTL,
    sign: s1.sign,
    now,
  });
  check("memo hit returns identical urls", second[0] === first[0] && second[1] === first[1]);
  check("memo hit does not call the signer", s1.calls.length === 1);

  // 5–6: partial miss signs only the new path, order preserved
  const third = await getSignedUrlsCached({
    bucket: "b",
    paths: ["d", "a"],
    ttlSeconds: TTL,
    sign: s1.sign,
    now,
  });
  check("partial miss signs only the missing path", s1.calls.length === 2 && s1.calls[1].join(",") === "d");
  check("partial miss preserves order (fresh, cached)", third[0] === "signed:d:2" && third[1] === "signed:a:1");

  // 7: past 75% of TTL the entry refreshes
  nowMs += TTL * 1000 * 0.8;
  await getSignedUrlsCached({ bucket: "b", paths: ["a"], ttlSeconds: TTL, sign: s1.sign, now });
  check("entry past 75% of TTL re-signs", s1.calls.length === 3);

  // 8: null results are returned but never cached
  const s2 = makeSigner();
  clearSignedUrlCache();
  const n1 = await getSignedUrlsCached({ bucket: "b", paths: ["missing"], ttlSeconds: TTL, sign: s2.sign, now });
  await getSignedUrlsCached({ bucket: "b", paths: ["missing"], ttlSeconds: TTL, sign: s2.sign, now });
  check("null result returned and retried next call", n1[0] === null && s2.calls.length === 2);

  // 9: same path, different bucket = distinct entries
  const s3 = makeSigner();
  clearSignedUrlCache();
  await getSignedUrlsCached({ bucket: "b1", paths: ["x"], ttlSeconds: TTL, sign: s3.sign, now });
  await getSignedUrlsCached({ bucket: "b2", paths: ["x"], ttlSeconds: TTL, sign: s3.sign, now });
  check("bucket is part of the cache key", s3.calls.length === 2);

  // 10: eviction keeps the map bounded (cap 1000)
  const s4 = makeSigner();
  clearSignedUrlCache();
  const many = Array.from({ length: 1001 }, (_, i) => `p${i}`);
  await getSignedUrlsCached({ bucket: "b", paths: many, ttlSeconds: TTL, sign: s4.sign, now });
  await getSignedUrlsCached({ bucket: "b", paths: ["p0"], ttlSeconds: TTL, sign: s4.sign, now });
  check("oldest entry evicted past 1000 and re-signed", s4.calls.length === 2 && s4.calls[1].join(",") === "p0");

  console.log(failures === 0 ? `smoke-signed-url-cache: ${caseNo}/${caseNo} passed` : `${failures} FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
```

- [x] **Step 2: Run to verify it fails**

Run: `npx tsx scripts/smoke-signed-url-cache.ts`
Expected: FAIL — cannot resolve `../src/lib/signed-url-cache`.

- [x] **Step 3: Implement the cache**

`src/lib/signed-url-cache.ts`:

```ts
// In-memory memo for Supabase storage signed URLs. Stable URLs across renders
// let the browser image cache actually hit; a fresh serverless instance just
// re-signs. The signer is injected so this stays runnable under plain tsx.
export type SignBatch = (
  paths: string[],
  ttlSeconds: number
) => Promise<(string | null)[]>;

type Entry = { url: string; expiresAtMs: number };

const MAX_ENTRIES = 1000;
// Reuse while >25% of the TTL remains; past that, re-sign so a URL handed to
// the client never arrives nearly expired.
const REFRESH_FRACTION = 0.25;

const cache = new Map<string, Entry>();

export function clearSignedUrlCache(): void {
  cache.clear();
}

export async function getSignedUrlsCached(opts: {
  bucket: string;
  paths: string[];
  ttlSeconds: number;
  sign: SignBatch;
  now?: () => number;
}): Promise<(string | null)[]> {
  const { bucket, paths, ttlSeconds, sign } = opts;
  const now = opts.now ?? Date.now;
  const ttlMs = ttlSeconds * 1000;

  const out: (string | null)[] = new Array(paths.length).fill(null);
  const missIdx: number[] = [];

  paths.forEach((path, i) => {
    const entry = cache.get(`${bucket}:${path}`);
    if (entry && entry.expiresAtMs - now() > ttlMs * REFRESH_FRACTION) {
      out[i] = entry.url;
    } else {
      missIdx.push(i);
    }
  });

  if (missIdx.length > 0) {
    const fresh = await sign(missIdx.map((i) => paths[i]), ttlSeconds);
    const expiresAtMs = now() + ttlMs;
    missIdx.forEach((pathIdx, j) => {
      const url = fresh[j] ?? null;
      out[pathIdx] = url;
      if (url) {
        const key = `${bucket}:${paths[pathIdx]}`;
        cache.delete(key); // re-insert so iteration order tracks recency
        cache.set(key, { url, expiresAtMs });
        if (cache.size > MAX_ENTRIES) {
          const oldest = cache.keys().next().value;
          if (oldest !== undefined) cache.delete(oldest);
        }
      }
    });
  }

  return out;
}
```

- [x] **Step 4: Run to verify it passes**

Run: `npx tsx scripts/smoke-signed-url-cache.ts`
Expected: `smoke-signed-url-cache: 10/10 passed`, exit 0. Also `npm run typecheck` → 0 errors.

- [x] **Step 5: Commit**

`git commit -m "perf: signed-url memo cache + smoke test"`

---

### Task 3: adopt the memo in queries.ts + parallel media signing

**Files:**
- Modify: `src/lib/queries.ts` (`attachMediaUrls`, `getCustomExercises`, `getSessionPhotos`, `getBodyPhotos`, `getProfile`)

**Interfaces:**
- Consumes: `getSignedUrlsCached`, `SignBatch` from Task 2.
- Produces: no signature changes — all query helpers keep their existing return types.

- [x] **Step 1: Add a private adapter near the top of queries.ts (below VIDEO_URL_TTL)**

```ts
import { getSignedUrlsCached } from "@/lib/signed-url-cache";

function signCached(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bucket: string,
  paths: string[],
  ttlSeconds: number
): Promise<(string | null)[]> {
  return getSignedUrlsCached({
    bucket,
    paths,
    ttlSeconds,
    sign: async (missing, ttl) => {
      const { data } = await supabase.storage.from(bucket).createSignedUrls(missing, ttl);
      return missing.map((_, i) => data?.[i]?.signedUrl ?? null);
    },
  });
}
```

- [x] **Step 2: Rewrite `attachMediaUrls` — memoized and posters ∥ videos**

```ts
async function attachMediaUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  exercises: ProgramExercise[]
): Promise<void> {
  const withPoster = exercises.filter((e) => e.poster_path);
  const withVideo = exercises.filter((e) => e.video_path);
  const [posterUrls, videoUrls] = await Promise.all([
    withPoster.length
      ? signCached(supabase, VIDEO_BUCKET, withPoster.map((e) => e.poster_path as string), VIDEO_URL_TTL)
      : [],
    withVideo.length
      ? signCached(supabase, VIDEO_BUCKET, withVideo.map((e) => e.video_path as string), VIDEO_URL_TTL)
      : [],
  ]);
  withPoster.forEach((e, i) => {
    e.poster_signed_url = posterUrls[i] ?? null;
  });
  withVideo.forEach((e, i) => {
    e.video_signed_url = videoUrls[i] ?? null;
  });
}
```

- [x] **Step 3: Swap the remaining call sites**

- `getCustomExercises`: replace both `supabase.storage.from(VIDEO_BUCKET).createSignedUrls(...)` calls inside the existing `Promise.all` with `signCached(supabase, VIDEO_BUCKET, posterPaths, VIDEO_URL_TTL)` and `signCached(supabase, VIDEO_BUCKET, videoRows.map(...), VIDEO_URL_TTL)`; the null-branch stays. Downstream mapping reads `poster.data?.[i]?.signedUrl` today — change to `poster[i]` / `videoUrlByPath` built from the string array.
- `getSessionPhotos` / `getBodyPhotos`: replace `createSignedUrls(paths, 60 * 60)` + `signErr` throw with `const signed = await signCached(supabase, "workout-photos", paths, 60 * 60);` and map `signed_url: signed[i] ?? ""`. (Signing failures now degrade to empty URLs instead of throwing — same resilience pattern as `getFavoriteSlugs`.)
- `getProfile`: replace the avatar `createSignedUrl` block with `avatarSignedUrl = (await signCached(supabase, "workout-photos", [data.avatar_path], 60 * 60))[0] ?? null;`
- Do **not** touch `signCustomVideoUrl` in `actions/custom-exercise.ts` (fresh-on-demand by design).

- [x] **Step 4: Verify**

Run: `npm run typecheck` → 0 errors. `npx tsx scripts/smoke-signed-url-cache.ts` → 10/10.

- [x] **Step 5: Commit**

`git commit -m "perf: stable signed media URLs via memo cache"`

---

### Task 4: /program waterfall collapse

**Files:**
- Modify: `src/lib/queries.ts:302-340` (`getNextWorkout` head)
- Modify: `src/app/(app)/program/page.tsx:44-56`

**Interfaces:** no signature changes; `getNextWorkout` decision logic byte-identical after the parallel fetch.

- [x] **Step 1: Parallelize `getNextWorkout`'s two session reads**

Replace the two sequential `await supabase...maybeSingle()` blocks with:

```ts
const [{ data: inProgress }, { data: lastFinished }] = await Promise.all([
  supabase
    .from("workout_sessions")
    .select("id, week_number, program_day_id")
    .in("program_day_id", dayIds)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle(),
  supabase
    .from("workout_sessions")
    .select("week_number, program_day_id, ended_at, is_rest_skip")
    .in("program_day_id", dayIds)
    .not("ended_at", "is", null)
    .order("ended_at", { ascending: false })
    .limit(1)
    .maybeSingle(),
]);
```

Everything below (in-progress wins, today-pinning, cycle advance) is unchanged.

- [x] **Step 2: Move the reap into `/program`'s first wave**

In `program/page.tsx`, replace the `if (userId) await reapStaleSession(...)` line and the first `Promise.all` with:

```ts
// Reap runs alongside the program/profile reads: it touches only
// workout_sessions/set_logs, which nothing in this wave reads. The
// session-reading queries in the wave below MUST stay after it.
const [, program, allPrograms, units, todayWeight, goalWeight] =
  await Promise.all([
    userId ? reapStaleSession(supabase, userId) : Promise.resolve(null),
    getCurrentProgram(),
    getAllPrograms(),
    getUnitsServer(),
    getTodayWeightLb(),
    getGoalWeight(),
  ]);
```

The second wave (`getNextWorkout`, `getCompletedSlots`, `getUndoableSkip`) stays exactly where it is.

- [x] **Step 3: Verify + commit**

Run: `npm run typecheck` → 0 errors.
`git commit -m "perf: collapse /program query waterfall"`

---

### Task 5: /workout parallel reads

**Files:**
- Modify: `src/app/(app)/workout/[sessionId]/page.tsx:23-31`

- [x] **Step 1: Fetch session and program together**

```ts
const [session, program] = await Promise.all([
  getSession(sessionId),
  getCurrentProgram(),
]);
if (!session) notFound();
if (session.ended_at) redirect(`/history/${sessionId}`);
if (!program) notFound();

const day = program.days.find((d) => d.id === session.program_day_id);
if (!day) notFound();
```

(Guard order preserved: session existence → ended redirect → program. The extra `getCurrentProgram` on the ended-session path costs nothing user-visible — it redirects anyway.)

- [x] **Step 2: Verify + commit**

Run: `npm run typecheck` → 0 errors.
`git commit -m "perf: parallelize /workout session+program reads"`

---

### Task 6: /progress single wave

**Files:**
- Modify: `src/app/(app)/progress/page.tsx:44-71`

- [x] **Step 1: Fold the month grid into the main wave**

Replace the `Promise.all` and the trailing `monthGridSessions` block with:

```ts
const win = computeProgressWindow(range, anchor, todayKey);
const needsMonthGrid = range === "month" || range === "year";
const [yStr, mStr] = anchor.split("-");
const monthGridYear = needsMonthGrid ? Number(yStr) : 0;
const monthGridMonth = needsMonthGrid ? Number(mStr) : 0;
const [data, weekStreak, units, monthGridSessions] = await Promise.all([
  getProgressForRange(win.startKey, win.endKey, win.buckets, win.bucketKind, tz),
  getWeekStreak(tz),
  getUnitsServer(),
  needsMonthGrid
    ? getSessionsByDateForMonth(monthGridYear, monthGridMonth, tz)
    : Promise.resolve(null),
]);
```

Keep the earlier `getLatestSessionDateKey` await as-is (the Last tab's window genuinely depends on it). Update the later JSX that referenced the old `let` variables — they are now `const` with the same names.

- [x] **Step 2: Verify + commit**

Run: `npm run typecheck` → 0 errors.
`git commit -m "perf: single query wave on /progress"`

---

### Task 7: missing loading.tsx skeletons

**Files (create):**
- `src/app/(app)/history/[sessionId]/loading.tsx`
- `src/app/(app)/history/exercise/[id]/loading.tsx`
- `src/app/(app)/program/library/loading.tsx`
- `src/app/(app)/program/library/[programId]/loading.tsx`
- `src/app/(app)/program/library/[programId]/[dayId]/loading.tsx`
- `src/app/(app)/program/exercises/loading.tsx`
- `src/app/(app)/program/exercises/new/loading.tsx`

**Interfaces:** none — pure UI. House idiom (from `program/loading.tsx`): root has `aria-busy="true"` + `aria-label`, blocks are `bg-surface-subtle animate-pulse`, cards are `border border-border bg-surface`.

- [x] **Step 1: history/[sessionId]/loading.tsx** — back link, header (eyebrow, title, 3-col stat grid), 4 exercise cards:

```tsx
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading workout">
      <div className="h-5 w-24 rounded bg-surface-subtle animate-pulse" />
      <header className="space-y-2">
        <div className="h-3 w-48 rounded bg-surface-subtle animate-pulse" />
        <div className="h-6 w-56 rounded bg-surface-subtle animate-pulse" />
        <div className="grid grid-cols-3 gap-4 pt-3 border-t border-border">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-5 w-14 rounded bg-surface-subtle animate-pulse" />
              <div className="h-2.5 w-10 rounded bg-surface-subtle animate-pulse" />
            </div>
          ))}
        </div>
      </header>
      <ul className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i} className="rounded-2xl border border-border bg-surface p-3 space-y-2">
            <div className="h-4 w-2/3 rounded bg-surface-subtle animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-surface-subtle animate-pulse" />
            <div className="h-3 w-1/3 rounded bg-surface-subtle animate-pulse" />
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [x] **Step 2: history/exercise/[id]/loading.tsx** — back link, header, chart box:

```tsx
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading exercise progress">
      <div className="h-5 w-24 rounded bg-surface-subtle animate-pulse" />
      <header className="space-y-2">
        <div className="h-3 w-32 rounded bg-surface-subtle animate-pulse" />
        <div className="h-6 w-52 rounded bg-surface-subtle animate-pulse" />
        <div className="h-4 w-40 rounded bg-surface-subtle animate-pulse" />
      </header>
      <div className="rounded-lg border border-border bg-surface p-3">
        <div className="h-64 w-full rounded bg-surface-subtle animate-pulse" />
      </div>
    </div>
  );
}
```

- [x] **Step 3: program/library/loading.tsx** — header (back circle + two lines) + two "N Days a Week" groups of cards:

```tsx
export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading program library">
      <header className="flex items-center gap-3">
        <div className="h-9 w-9 shrink-0 rounded-full bg-surface-subtle animate-pulse" />
        <div className="min-w-0 space-y-1.5">
          <div className="h-6 w-40 rounded bg-surface-subtle animate-pulse" />
          <div className="h-3 w-56 rounded bg-surface-subtle animate-pulse" />
        </div>
      </header>
      {Array.from({ length: 2 }).map((_, g) => (
        <section key={g} className="space-y-2">
          <div className="h-4 w-32 rounded bg-surface-subtle animate-pulse" />
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="aspect-[3/2] w-full rounded-2xl border border-border bg-surface-subtle animate-pulse" />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
```

(Eyeball against the real `LibraryList` render during Task 11 live preview and adjust block shapes if the list uses a different card geometry.)

- [x] **Step 4: program/library/[programId]/loading.tsx** — header, hero, description line, Workouts rows, sticky CTA:

```tsx
export default function Loading() {
  return (
    <div className="space-y-5 pb-4" aria-busy="true" aria-label="Loading program">
      <header className="flex items-center gap-3">
        <div className="h-9 w-9 shrink-0 rounded-full bg-surface-subtle animate-pulse" />
        <div className="h-6 w-48 rounded bg-surface-subtle animate-pulse" />
      </header>
      <div className="aspect-[3/2] w-full rounded-2xl border border-border bg-surface-subtle animate-pulse" />
      <div className="h-4 w-3/4 rounded bg-surface-subtle animate-pulse" />
      <section className="space-y-2">
        <div className="h-5 w-24 rounded bg-surface-subtle animate-pulse" />
        <ul className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5">
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="h-2.5 w-12 rounded bg-surface-subtle animate-pulse" />
                <div className="h-4 w-2/3 rounded bg-surface-subtle animate-pulse" />
                <div className="h-3 w-20 rounded bg-surface-subtle animate-pulse" />
              </div>
            </li>
          ))}
        </ul>
      </section>
      <div className="sticky bottom-20 z-30 -mx-4 px-4 py-2">
        <div className="h-12 w-full rounded-md bg-surface-subtle animate-pulse" />
      </div>
    </div>
  );
}
```

- [x] **Step 5: program/library/[programId]/[dayId]/loading.tsx** — header, day pills, stat row, exercise rows, sticky CTA:

```tsx
export default function Loading() {
  return (
    <div className="space-y-5 pb-4" aria-busy="true" aria-label="Loading workout day">
      <header className="flex items-center gap-3">
        <div className="h-9 w-9 shrink-0 rounded-full bg-surface-subtle animate-pulse" />
        <div className="min-w-0 space-y-1.5">
          <div className="h-2.5 w-12 rounded bg-surface-subtle animate-pulse" />
          <div className="h-6 w-44 rounded bg-surface-subtle animate-pulse" />
        </div>
      </header>
      <div className="flex items-center gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 w-16 rounded-full bg-surface-subtle animate-pulse shrink-0" />
        ))}
      </div>
      <div className="h-16 w-full rounded-2xl border border-border bg-surface-subtle animate-pulse" />
      <ul className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
            <div className="w-10 h-10 shrink-0 rounded-full bg-surface-subtle animate-pulse" />
            <div className="w-[30px] h-[30px] shrink-0 rounded bg-surface-subtle animate-pulse" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="h-3.5 w-3/4 rounded bg-surface-subtle animate-pulse" />
              <div className="h-3 w-1/3 rounded bg-surface-subtle animate-pulse" />
            </div>
          </li>
        ))}
      </ul>
      <div className="sticky bottom-20 z-30 -mx-4 px-4 py-2">
        <div className="h-12 w-full rounded-md bg-surface-subtle animate-pulse" />
      </div>
    </div>
  );
}
```

- [x] **Step 6: program/exercises/loading.tsx** — header with Add pill, body-map block, 2-col card grid:

```tsx
export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading exercises">
      <header className="flex items-center gap-3">
        <div className="h-9 w-9 shrink-0 rounded-full bg-surface-subtle animate-pulse" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="h-6 w-28 rounded bg-surface-subtle animate-pulse" />
          <div className="h-3 w-48 rounded bg-surface-subtle animate-pulse" />
        </div>
        <div className="h-9 w-32 shrink-0 rounded-full bg-surface-subtle animate-pulse" />
      </header>
      <div className="h-64 w-full rounded-2xl border border-border bg-surface-subtle animate-pulse" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-2xl border border-border bg-surface-subtle animate-pulse" />
        ))}
      </div>
    </div>
  );
}
```

- [x] **Step 7: program/exercises/new/loading.tsx** — header + three media-chooser blocks + form lines:

```tsx
export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading new exercise form">
      <header className="flex items-center gap-3">
        <div className="h-9 w-9 shrink-0 rounded-full bg-surface-subtle animate-pulse" />
        <div className="min-w-0 space-y-1.5">
          <div className="h-6 w-48 rounded bg-surface-subtle animate-pulse" />
          <div className="h-3 w-56 rounded bg-surface-subtle animate-pulse" />
        </div>
      </header>
      <div className="grid gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 w-full rounded-2xl border border-border bg-surface-subtle animate-pulse" />
        ))}
      </div>
      <div className="h-11 w-full rounded-md bg-surface-subtle animate-pulse" />
    </div>
  );
}
```

- [x] **Step 8: Verify + commit**

Run: `npm run typecheck` → 0 errors.
`git commit -m "perf: loading skeletons for history, library, exercise routes"`

---

### Task 8: pending feedback on navigation links

**Files:**
- Create: `src/components/nav-pending.tsx`
- Modify: `src/app/globals.css` (append keyframes)
- Modify: `src/app/(app)/program/day-tabs.tsx` (pill + chevron content)
- Modify: `src/app/(app)/progress/month-grid.tsx` (linked day content)
- Modify: `src/app/(app)/progress/range-tabs.tsx` (tab label)

**Interfaces:**
- Produces: `NavPending({ children, className? })` — client component that must render **inside** a `<Link>` (that's `useLinkStatus`'s contract).
- `month-grid.tsx` and `range-tabs.tsx` are Server Components — they stay server; only the imported `NavPending` is client.

- [x] **Step 1: The component**

```tsx
"use client";

import { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils";

// Renders inside a <Link>; dims its content while that navigation is pending.
// The 150ms animation delay keeps cache-hit navigations from flashing.
export function NavPending({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { pending } = useLinkStatus();
  return (
    <span
      data-nav-pending={pending ? "" : undefined}
      className={cn("inline-flex items-center justify-center gap-1", className)}
    >
      {children}
    </span>
  );
}
```

- [x] **Step 2: Keyframes in globals.css (append at the end)**

```css
@keyframes nav-pending {
  50% {
    opacity: 0.4;
  }
}
[data-nav-pending] {
  animation: nav-pending 1s ease-in-out 0.15s infinite;
}
```

- [x] **Step 3: Wire the three call sites**

- `day-tabs.tsx`: pill `<Link>` content becomes
  `<NavPending>{isCompleted ? <Check className="w-3 h-3" aria-hidden="true" /> : null}Day {slot.globalNumber}</NavPending>`;
  both chevron `<Link>`s wrap their icon: `<NavPending><ChevronLeft className="w-4 h-4" /></NavPending>`.
- `month-grid.tsx`: in the `sessionId` branch, `{content}` becomes `<NavPending>{content}</NavPending>`.
- `range-tabs.tsx`: `{t.label}` becomes `<NavPending>{t.label}</NavPending>`.

- [x] **Step 4: Verify + commit**

Run: `npm run typecheck` → 0 errors.
`git commit -m "feat: pending feedback on day pills, range tabs, month grid"`

---

### Task 9: lazy Recharts

**Files:**
- Create: `src/app/(app)/progress/progress-bar-chart-lazy.tsx`
- Create: `src/app/(app)/history/exercise/[id]/exercise-chart-lazy.tsx`
- Create: `src/app/(app)/body/body-chart-lazy.tsx`
- Modify: `src/app/(app)/progress/page.tsx:20,124`, `src/app/(app)/history/exercise/[id]/page.tsx:7,114`, `src/app/(app)/body/metric-detail.tsx:22,193`

**Interfaces:**
- Produces: `ProgressBarChartLazy`, `ExerciseChartLazy`, `MetricChartLazy` — prop-identical to the components they wrap. Type-only imports (`ChartPoint`, `MetricPoint`) keep coming from the original modules (erased at build, no runtime pull).

- [x] **Step 1: progress-bar-chart-lazy.tsx**

```tsx
"use client";

import dynamic from "next/dynamic";

// Recharts is ~100KB min+gz — load it after the page is interactive. The
// fallback mirrors ProgressBarChart's container so nothing shifts.
export const ProgressBarChartLazy = dynamic(
  () => import("./progress-bar-chart").then((m) => m.ProgressBarChart),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-border bg-surface p-3 space-y-2">
        <div className="px-1">
          <div className="h-3 w-16 rounded bg-surface-subtle animate-pulse" />
        </div>
        <div className="h-48 w-full rounded bg-surface-subtle animate-pulse" />
      </div>
    ),
  }
);
```

- [x] **Step 2: exercise-chart-lazy.tsx**

```tsx
"use client";

import dynamic from "next/dynamic";

export const ExerciseChartLazy = dynamic(
  () => import("./exercise-chart").then((m) => m.ExerciseChart),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg border border-border bg-surface p-3">
        <div className="h-64 w-full rounded bg-surface-subtle animate-pulse" />
      </div>
    ),
  }
);
```

- [x] **Step 3: body-chart-lazy.tsx**

```tsx
"use client";

import dynamic from "next/dynamic";

export const MetricChartLazy = dynamic(
  () => import("./body-chart").then((m) => m.MetricChart),
  {
    ssr: false,
    loading: () => <div className="h-56 w-full rounded bg-surface-subtle animate-pulse" />,
  }
);
```

(Check `MetricChart`'s real wrapper markup around its `h-56` chart div and mirror it in the fallback if it has a bordered container.)

- [x] **Step 4: Swap consumers**

- `progress/page.tsx`: `import { ProgressBarChartLazy } from "./progress-bar-chart-lazy";` → `<ProgressBarChartLazy buckets={data.buckets} />`.
- `history/exercise/[id]/page.tsx`: keep `import type { ChartPoint } from "./exercise-chart";`, add lazy import, render `<ExerciseChartLazy points={points} isTime={isTime} units={units} />`.
- `body/metric-detail.tsx`: keep `type MetricPoint` from `"./body-chart"`, swap the component import/usage to `MetricChartLazy`.

- [x] **Step 5: Verify + commit**

Run: `npm run typecheck` → 0 errors.
`git commit -m "perf: code-split recharts behind lazy chart wrappers"`

---

### Task 10: preconnect image/media origins

**Files:**
- Modify: `src/app/layout.tsx`

- [x] **Step 1: Add preconnect links (React 19 hoists them into `<head>`)**

Inside `RootLayout`, before `<TimezoneInit />`:

```tsx
const supabaseOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin;
```

```tsx
<body className="min-h-full flex flex-col">
  {/* no crossOrigin: exercise images/videos load as plain no-CORS <img>/<video>,
      and preconnect pools are keyed by crossOrigin mode */}
  <link rel="preconnect" href="https://raw.githubusercontent.com" />
  <link rel="preconnect" href={supabaseOrigin} />
  <TimezoneInit />
  ...
```

- [x] **Step 2: Verify + commit**

Run: `npm run typecheck` → 0 errors.
`git commit -m "perf: preconnect exercise image and media origins"`

---

### Task 11: verification gate + before/after numbers

**Files:** none (verification only). Uses `claude-test@example.com` (never rahul@satel.ca).

- [x] **Step 1: Static gate**

Run: `npm run typecheck` (0 errors), `npm run lint` (0 errors; 2 pre-existing `progression.ts` warnings OK), `npx tsx scripts/smoke-signed-url-cache.ts` (10/10), `npm run build` (green).

- [x] **Step 2: Baseline numbers (pre-change build)**

```powershell
git worktree add ../wt-baseline origin/main
Copy-Item .env.local ../wt-baseline/.env.local
cd ../wt-baseline; npm ci; npm run build; npx next start -p 3001
```

Auth a Playwright session on `http://localhost:3001` (OTP via `npx tsx scripts/test-otp.ts`, cookie flow per CLAUDE.md). Record, on the test account: (a) `/program` cold-load time (navigation start → exercise list visible), (b) day-pill tap → content-swap time, (c) Program→Progress→Program tab round-trip time, (d) month-grid day tap → history content time. Then stop the server and `git worktree remove ../wt-baseline --force`.

- [x] **Step 3: After numbers (branch build)**

`npx next start -p 3000` on the branch build; repeat the same four measurements, same account, plus:

- day-pill hop then re-hop within 30 s → second hop shows **no RSC network fetch** (check via Playwright `browser_network_requests`);
- month-grid tap → skeleton (`aria-busy`) visible before content;
- two consecutive `/program` loads → **identical** custom-exercise poster URLs (assert `img[src]` equality across loads);
- library → program → day drill-in shows skeletons on cold taps;
- charts on `/progress`, `/body` metric detail, `/history/exercise/[id]` render after a brief fallback, no layout jump, zero console errors anywhere.

- [x] **Step 4: Record the numbers** in the PR body table (before/after per flow). Prod TTFB before/after gets added post-deploy once Deployment Protection is off (before = current prod, after = merged deploy).

---

### Task 12: ship

- [x] **Step 1:** Push: `git push -u origin feat/startup-speed`.
- [x] **Step 2:** PR per house style — title `⚡ Faster startup and screen switches`, body via the pr-description skill (with the before/after table), `--assignee @me`. Watch Vercel checks in the background.
- [x] **Step 3:** Update `.claude/sessions.md` (new entry, keep 3) + `NEXT-SESSION.md` (state, decisions incl. rejected PPR/SW/TanStack, next steps: Rahul's dashboard checklist + device test), commit `docs: session log + handoff for startup-speed phase`.
- [x] **Step 4:** Report with verifiable numbers + 🟢🟡🔴 status line.
