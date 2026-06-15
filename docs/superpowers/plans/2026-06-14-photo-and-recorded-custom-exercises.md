# Photo + Recorded-Clip Custom Exercises Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users create a custom exercise from just a photo (square-reframed thumbnail) or an in-app recording (up to 80s), alongside the existing video upload.

**Architecture:** A photo-only exercise is a new media case — video-less but with a *durable* poster. We make `custom_exercises.video_path` nullable, share the pan/zoom reframe math between the video cropper and a new image reframer, add an in-app `MediaRecorder` recorder, and fix the add-to-program snapshot + thumbnail-signing paths so video-less customs render their photo (not the app logo).

**Tech Stack:** Next.js 16 (App Router, RSC + server actions), React 19, TypeScript strict, Zod, Supabase Storage (signed URLs), `getUserMedia`/`MediaRecorder`, canvas. No unit-test runner — pure logic is verified with `npx tsx scripts/smoke-*.ts`; everything else with `npm run typecheck` / `npm run lint` / `npm run build` + manual browser checks (test account `claude-test@example.com`).

**Spec:** `docs/superpowers/specs/2026-06-14-photo-and-recorded-custom-exercises-design.md`

**Verification conventions used below:**
- `npm run typecheck` → expect `tsc --noEmit` to exit 0 (no output).
- `npm run lint` → expect 0 errors (2 pre-existing `progression.ts` warnings are OK).
- Smoke: `npx tsx scripts/smoke-<name>.ts` → expect final `✓` line and exit 0.
- Manual steps describe what to click and what you must see.

**File structure (created / modified):**
- Create: `supabase/migrations/20260614000000_custom_exercise_photo.sql`
- Create: `src/lib/reframe.ts` — pure pan/zoom/square-crop geometry (shared)
- Create: `src/lib/media-snapshot.ts` — pure storage-path snapshot validator (shared by two actions)
- Create: `src/components/image-reframer.tsx` — square reframe over an `<img>`
- Create: `src/components/video-recorder.tsx` — in-app 80s recorder
- Create: `scripts/smoke-reframe.ts`, `scripts/smoke-media-snapshot.ts`
- Modify: `src/lib/video-upload.ts` (limits + recorder helpers)
- Modify: `src/lib/extract-video-poster.ts` (add `extractImagePoster`)
- Modify: `src/lib/queries.ts` (`getCustomExercises`, `attachVideoUrls`→`attachMediaUrls`, `CustomExercise` type)
- Modify: `src/lib/exercise-catalog.ts` (`posterPath` on `CatalogEntry`)
- Modify: `src/components/video-cropper.tsx` (use `reframe.ts`; Infinity-duration fix)
- Modify: `src/app/actions/custom-exercise.ts` (nullable `videoPath`, use validator)
- Modify: `src/app/actions/program.ts` (use validator; allow poster-only)
- Modify: `src/app/(app)/program/exercises/new/create-custom-exercise-client.tsx` (3-way chooser)
- Modify: `src/app/(app)/program/exercises/new/page.tsx` (subtitle)
- Modify: `src/app/(app)/program/add/add-exercise-client.tsx` (snapshot photo-only)
- Modify: `src/app/(app)/program/exercises/exercise-library.tsx` (empty-state copy)
- Modify: `src/app/(app)/program/page.tsx`, `src/app/(app)/workout/[sessionId]/page.tsx` (+ sweep) — prefer signed poster for thumbnail
- Regenerate: `src/lib/supabase/database.types.ts`

---

## Task 1: Make the read path support video-less customs (migration + types + query)

**Files:**
- Create: `supabase/migrations/20260614000000_custom_exercise_photo.sql`
- Modify: `src/lib/supabase/database.types.ts` (regenerated, not hand-edited)
- Modify: `src/lib/queries.ts` (`CustomExercise` type + `getCustomExercises`)
- Modify: `src/lib/exercise-catalog.ts` (`posterPath` on `CatalogEntry` + `customToCatalogEntry`)

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260614000000_custom_exercise_photo.sql`:

```sql
-- Photo-only custom exercises: a custom exercise may now be just a thumbnail
-- (no video). poster_path stays NOT NULL (every entry has a thumbnail); the
-- square crop is baked into poster.jpg, so crop_rect/trim/aspect stay null for
-- photo rows. video_path becomes nullable for the video-less case.
alter table public.custom_exercises alter column video_path drop not null;
```

- [ ] **Step 2: Push the migration and regenerate types**

Run:
```bash
npx supabase db push && npm run db:types
```
Expected: push reports the new migration applied; `database.types.ts` regenerates with `custom_exercises.Row.video_path: string | null`.

> If this checkout has no linked Supabase env, STOP and tell the user — Tasks 1, 5, 13 and the manual checks need the DB. Do not hand-edit `database.types.ts`.

- [ ] **Step 3: Widen the `CustomExercise` type for the nullable video path**

In `src/lib/queries.ts`, in the `CustomExercise` type, change:
```ts
  video_path: string;
```
to:
```ts
  video_path: string | null;
```

- [ ] **Step 4: Sign the poster always, the video only when present**

In `src/lib/queries.ts`, replace the body of `getCustomExercises` after the `if (data.length === 0) return [];` line (the `videoPaths`/`posterPaths`/`Promise.all`/`return data.map(...)` block) with:

```ts
  const posterPaths = data.map((r) => r.poster_path);
  const videoRows = data.filter((r) => r.video_path);
  const [poster, video] = await Promise.all([
    supabase.storage.from(VIDEO_BUCKET).createSignedUrls(posterPaths, VIDEO_URL_TTL),
    // null (not a mixed-shape fallback object) so the tuple types cleanly as
    // `result | null` — Promise.all resolves a non-thenable to itself.
    videoRows.length
      ? supabase.storage
          .from(VIDEO_BUCKET)
          .createSignedUrls(
            videoRows.map((r) => r.video_path as string),
            VIDEO_URL_TTL
          )
      : null,
  ]);
  const videoUrlByPath = new Map<string, string>();
  videoRows.forEach((r, i) => {
    const url = video?.data?.[i]?.signedUrl;
    if (url && r.video_path) videoUrlByPath.set(r.video_path, url);
  });

  return data.map((r, i) => ({
    id: r.id,
    name: r.name,
    muscles: r.muscles ?? [],
    video_path: r.video_path,
    poster_path: r.poster_path,
    video_signed_url: r.video_path
      ? videoUrlByPath.get(r.video_path) ?? null
      : null,
    poster_signed_url: poster.data?.[i]?.signedUrl ?? null,
    crop_rect: (r.crop_rect as ReframeRect | null) ?? null,
    trim:
      r.trim_start_seconds != null && r.trim_end_seconds != null
        ? { startSec: r.trim_start_seconds, endSec: r.trim_end_seconds }
        : null,
    aspect_ratio: r.aspect_ratio,
  }));
```

- [ ] **Step 5: Add `posterPath` to `CatalogEntry` and carry the nullable video path**

In `src/lib/exercise-catalog.ts`:

In the `CatalogEntry` type, add `posterPath` next to `posterUrl`:
```ts
  // Signed poster URL used as the thumbnail for custom entries.
  posterUrl?: string;
  // Durable storage path for the poster (NOT the expiring signed URL) — the
  // add-to-program flow snapshots this for photo-only customs.
  posterPath?: string;
  video?: CatalogVideo;
```

In `customToCatalogEntry`, change the param's `video_path` type and set `posterPath`:
```ts
export function customToCatalogEntry(c: {
  id: string;
  name: string;
  muscles: string[];
  video_path: string | null;
  poster_path: string;
  video_signed_url: string | null;
  poster_signed_url: string | null;
  crop_rect: ReframeRect | null;
  trim: TrimBounds | null;
  aspect_ratio: number | null;
}): CatalogEntry {
  return {
    id: c.id,
    name: c.name,
    equipment: null,
    category: "custom",
    force: null,
    level: null,
    primary: c.muscles,
    custom: true,
    posterUrl: c.poster_signed_url || undefined,
    posterPath: c.poster_path,
    video: c.video_signed_url
      ? {
          customExerciseId: c.id,
          videoPath: c.video_path as string,
          posterPath: c.poster_path,
          videoUrl: c.video_signed_url,
          posterUrl: c.poster_signed_url ?? "",
          rect: c.crop_rect,
          trim: c.trim,
          aspect: c.aspect_ratio,
        }
      : undefined,
  };
}
```

- [ ] **Step 6: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: exit 0 (2 pre-existing `progression.ts` warnings OK).

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260614000000_custom_exercise_photo.sql src/lib/supabase/database.types.ts src/lib/queries.ts src/lib/exercise-catalog.ts
git commit -m "Custom exercises: nullable video_path; read path supports video-less (photo) customs"
```

---

## Task 2: Bump limits + add recorder helpers (`video-upload.ts`)

**Files:**
- Modify: `src/lib/video-upload.ts`

- [ ] **Step 1: Raise the size + duration caps**

In `src/lib/video-upload.ts`, change:
```ts
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_VIDEO_SECONDS = 30;
```
to:
```ts
// 150 MB covers an ~80s phone upload; in-app recordings are bitrate-capped to ~25 MB.
export const MAX_VIDEO_BYTES = 150 * 1024 * 1024;
// Trim cap AND the in-app recorder's hard auto-stop.
export const MAX_VIDEO_SECONDS = 80;
```

- [ ] **Step 2: Add recorder mime/bitrate helpers**

In `src/lib/video-upload.ts`, append:

```ts
// ── In-app recorder (MediaRecorder) ──
// ~2.5 Mbps keeps an 80s clip ≈ 25 MB, well under MAX_VIDEO_BYTES.
export const RECORD_BITS_PER_SECOND = 2_500_000;

// First container MediaRecorder supports here. iOS Safari → mp4; Chrome/Android
// → webm. undefined lets MediaRecorder pick its own default.
export function pickRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t));
}

// File extension matching the chosen recorder container.
export function recorderExt(mimeType: string | undefined): string {
  return mimeType && mimeType.startsWith("video/mp4") ? "mp4" : "webm";
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/video-upload.ts
git commit -m "video-upload: 80s/150MB caps + MediaRecorder mime/bitrate helpers"
```

---

## Task 3: Shared reframe geometry (`reframe.ts`) + refactor `VideoCropper`

**Files:**
- Create: `src/lib/reframe.ts`
- Create: `scripts/smoke-reframe.ts`
- Modify: `src/components/video-cropper.tsx`

- [ ] **Step 1: Write the failing smoke test**

Create `scripts/smoke-reframe.ts`:

```ts
// Smoke test for the shared reframe geometry (src/lib/reframe.ts) used by both
// VideoCropper and ImageReframer. Asserts the centered square-crop rect for
// known source aspects, the zoom scaling, and clamping.
// Run: npx tsx scripts/smoke-reframe.ts
import { baseDims, rectFor, clampView, MAX_ZOOM } from "@/lib/reframe";

let failures = 0;
function near(label: string, got: number, want: number, eps = 1e-9) {
  if (Math.abs(got - want) > eps) {
    failures++;
    console.error(`  ✗ ${label}: got ${got}, want ${want}`);
  } else {
    console.log(`  ✓ ${label} = ${got.toFixed(4)}`);
  }
}

// Square crop in a 16:9 (1.7778) source → height-limited.
{
  const { baseW, baseH } = baseDims(1, 16 / 9);
  near("16:9 baseW", baseW, 9 / 16);
  near("16:9 baseH", baseH, 1);
}
// Square crop in a 9:16 portrait source → width-limited.
{
  const { baseW, baseH } = baseDims(1, 9 / 16);
  near("9:16 baseW", baseW, 1);
  near("9:16 baseH", baseH, 9 / 16);
}
// Square crop in a square source → full frame.
{
  const r = rectFor(1, 1, 1, { cx: 0.5, cy: 0.5 });
  near("square x", r.x, 0);
  near("square y", r.y, 0);
  near("square w", r.w, 1);
  near("square h", r.h, 1);
}
// 16:9 source, zoom 1, centered → centered tall square.
{
  const r = rectFor(1, 16 / 9, 1, { cx: 0.5, cy: 0.5 });
  near("16:9 z1 w", r.w, 9 / 16);
  near("16:9 z1 h", r.h, 1);
  near("16:9 z1 x", r.x, (1 - 9 / 16) / 2);
  near("16:9 z1 y", r.y, 0);
}
// Zoom 2 halves crop dims.
{
  const r = rectFor(1, 16 / 9, 2, { cx: 0.5, cy: 0.5 });
  near("16:9 z2 w", r.w, 9 / 32);
  near("16:9 z2 h", r.h, 0.5);
}
// clampView: zoom clamps to [1, MAX_ZOOM]; center clamps to keep crop inside.
{
  const v = clampView(1, 16 / 9, 99, { cx: -1, cy: -1 });
  near("clamp zoom", v.zoom, MAX_ZOOM);
  const cw = 9 / 16 / MAX_ZOOM;
  const ch = 1 / MAX_ZOOM;
  near("clamp cx", v.center.cx, cw / 2);
  near("clamp cy", v.center.cy, ch / 2);
}

if (failures > 0) {
  console.error(`\n✗ reframe smoke: ${failures} failure(s)`);
  process.exit(1);
}
console.log("\n✓ reframe smoke: square-crop geometry, zoom scaling, and clamping all correct");
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx tsx scripts/smoke-reframe.ts`
Expected: FAIL — module not found for `@/lib/reframe` (the file doesn't exist yet).

- [ ] **Step 3: Implement `reframe.ts`**

Create `src/lib/reframe.ts`:

```ts
// Pure pan/zoom/square-crop geometry shared by VideoCropper and ImageReframer so
// the editor preview and the baked output frame are pixel-identical. All rects
// are normalized 0..1 in source coordinates (see cropStyle in video-upload.ts).
import type { ReframeRect } from "@/lib/video-upload";

export const MAX_ZOOM = 4;

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

// Largest centered box of display aspect `targetAspect` (W/H) that fits inside a
// source of aspect `sourceAspect`, as a fraction (0..1) of the source.
export function baseDims(
  targetAspect: number,
  sourceAspect: number
): { baseW: number; baseH: number } {
  const ratio = targetAspect / sourceAspect;
  return ratio >= 1 ? { baseW: 1, baseH: 1 / ratio } : { baseW: ratio, baseH: 1 };
}

// Crop rect for a zoom + center, clamped so it stays inside the source.
export function rectFor(
  targetAspect: number,
  sourceAspect: number,
  zoom: number,
  center: { cx: number; cy: number }
): ReframeRect {
  const { baseW, baseH } = baseDims(targetAspect, sourceAspect);
  const cw = baseW / zoom;
  const ch = baseH / zoom;
  const cx = clamp(center.cx, cw / 2, 1 - cw / 2);
  const cy = clamp(center.cy, ch / 2, 1 - ch / 2);
  return { x: cx - cw / 2, y: cy - ch / 2, w: cw, h: ch };
}

// Clamp a desired zoom+center to legal bounds (zoom in [1, MAX_ZOOM]; center
// keeps the crop inside the source). Returns the clamped values.
export function clampView(
  targetAspect: number,
  sourceAspect: number,
  nextZoom: number,
  nextCenter: { cx: number; cy: number }
): { zoom: number; center: { cx: number; cy: number } } {
  const zoom = clamp(nextZoom, 1, MAX_ZOOM);
  const { baseW, baseH } = baseDims(targetAspect, sourceAspect);
  const cw = baseW / zoom;
  const ch = baseH / zoom;
  const cx = clamp(nextCenter.cx, cw / 2, 1 - cw / 2);
  const cy = clamp(nextCenter.cy, ch / 2, 1 - ch / 2);
  return { zoom, center: { cx, cy } };
}
```

- [ ] **Step 4: Run the smoke test to verify it passes**

Run: `npx tsx scripts/smoke-reframe.ts`
Expected: PASS — ends with `✓ reframe smoke: ...`.

- [ ] **Step 5: Refactor `VideoCropper` to use `reframe.ts`**

In `src/components/video-cropper.tsx`:

Add the import (next to the existing `video-upload` import):
```ts
import { MAX_ZOOM, baseDims, clamp, clampView, rectFor } from "@/lib/reframe";
```

Delete the now-duplicated local helpers and constant:
```ts
const MAX_ZOOM = 4;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}
```
(Keep `MIN_TRIM`. Keep `fmt`.)

Delete the local `baseDims` function:
```ts
  function baseDims(t: number) {
    const ratio = t / sa;
    return ratio >= 1 ? { baseW: 1, baseH: 1 / ratio } : { baseW: ratio, baseH: 1 };
  }
```

Replace the local `rectFor`:
```ts
  function rectFor(z: number, c: { cx: number; cy: number }): ReframeRect {
    const { baseW, baseH } = baseDims(target);
    const cw = baseW / z;
    const ch = baseH / z;
    const cx = clamp(c.cx, cw / 2, 1 - cw / 2);
    const cy = clamp(c.cy, ch / 2, 1 - ch / 2);
    return { x: cx - cw / 2, y: cy - ch / 2, w: cw, h: ch };
  }
```
with:
```ts
  function rectForView(z: number, c: { cx: number; cy: number }): ReframeRect {
    return rectFor(target, sa, z, c);
  }
```

Update the `rect` assignment:
```ts
  const rect = ready ? rectForView(zoom, center) : null;
```

Replace `applyView` to delegate clamping to `clampView`:
```ts
  function applyView(nextZoom: number, nextCenter: { cx: number; cy: number }) {
    const { zoom: z, center: c } = clampView(target, sa, nextZoom, nextCenter);
    zoomRef.current = z;
    centerRef.current = c;
    setZoom(z);
    setCenter(c);
  }
```

In `onStagePointerMove`, the pan branch still needs `baseDims` — it now comes from the import; replace `const { baseW, baseH } = baseDims(target);` (both occurrences inside `onStagePointerMove`) with:
```ts
    const { baseW, baseH } = baseDims(target, sa);
```

- [ ] **Step 6: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: exit 0.

- [ ] **Step 7: Manual regression — existing video reframe still works**

Start the app (`npm run dev`), sign in as `claude-test@example.com` (see CLAUDE.md "Previewing auth-gated pages"), go to `/program/exercises/new`, upload a short video via "Upload video", and confirm the reframe/zoom/trim editor behaves exactly as before (pan, pinch, zoom slider, Original/Square toggle, trim handles), then "Use" produces a thumbnail.

- [ ] **Step 8: Commit**

```bash
git add src/lib/reframe.ts scripts/smoke-reframe.ts src/components/video-cropper.tsx
git commit -m "Extract shared reframe geometry (reframe.ts) + smoke; VideoCropper uses it"
```

---

## Task 4: Pure media-snapshot validator (`media-snapshot.ts`)

**Files:**
- Create: `src/lib/media-snapshot.ts`
- Create: `scripts/smoke-media-snapshot.ts`

- [ ] **Step 1: Write the failing smoke test**

Create `scripts/smoke-media-snapshot.ts`:

```ts
// Smoke test for the storage-path snapshot validator (src/lib/media-snapshot.ts)
// shared by createCustomExercise and addExerciseToProgram.
// Run: npx tsx scripts/smoke-media-snapshot.ts
import { mediaSnapshotError } from "@/lib/media-snapshot";

const UID = "11111111-1111-1111-1111-111111111111";
const CID = "22222222-2222-2222-2222-222222222222";
const dir = `${UID}/exercise-videos/${CID}`;

let failures = 0;
function expect(label: string, got: string | null, wantOk: boolean) {
  const ok = got === null;
  if (ok !== wantOk) {
    failures++;
    console.error(`  ✗ ${label}: ${wantOk ? "expected OK" : "expected error"}, got ${got ?? "OK"}`);
  } else {
    console.log(`  ✓ ${label}`);
  }
}

// Catalog exercise — no media at all → OK.
expect("catalog (all null)", mediaSnapshotError(UID, { customExerciseId: null, videoPath: null, posterPath: null }), true);
// Video + poster, matched prefix → OK.
expect("video+poster matched", mediaSnapshotError(UID, { customExerciseId: CID, videoPath: `${dir}/source.mp4`, posterPath: `${dir}/poster.jpg` }), true);
// Poster-only (photo) matched prefix → OK (the new case).
expect("poster-only matched", mediaSnapshotError(UID, { customExerciseId: CID, videoPath: null, posterPath: `${dir}/poster.jpg` }), true);
// Poster present but no custom id → error.
expect("poster, no id", mediaSnapshotError(UID, { customExerciseId: null, videoPath: null, posterPath: `${dir}/poster.jpg` }), false);
// Video present but poster missing → error.
expect("video, no poster", mediaSnapshotError(UID, { customExerciseId: CID, videoPath: `${dir}/source.mp4`, posterPath: null }), false);
// Cross-user poster path → error.
expect("cross-user poster", mediaSnapshotError(UID, { customExerciseId: CID, videoPath: null, posterPath: `99999999-9999-9999-9999-999999999999/exercise-videos/${CID}/poster.jpg` }), false);
// Mismatched custom id in path → error.
expect("mismatched id", mediaSnapshotError(UID, { customExerciseId: CID, videoPath: null, posterPath: `${UID}/exercise-videos/33333333-3333-3333-3333-333333333333/poster.jpg` }), false);
// Video path outside owner folder but poster fine → error.
expect("video outside folder", mediaSnapshotError(UID, { customExerciseId: CID, videoPath: `someoneelse/source.mp4`, posterPath: `${dir}/poster.jpg` }), false);

if (failures > 0) {
  console.error(`\n✗ media-snapshot smoke: ${failures} failure(s)`);
  process.exit(1);
}
console.log("\n✓ media-snapshot smoke: poster-only allowed; cross-user/mismatched/missing-poster rejected");
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx tsx scripts/smoke-media-snapshot.ts`
Expected: FAIL — module not found for `@/lib/media-snapshot` (the file doesn't exist yet).

- [ ] **Step 3: Implement `media-snapshot.ts`**

Create `src/lib/media-snapshot.ts`:

```ts
// Validates that a snapshotted custom-exercise media set is self-consistent and
// scoped to the caller's own {uid}/exercise-videos/{customExerciseId}/ folder
// (defense-in-depth on top of storage RLS). Shared by createCustomExercise and
// addExerciseToProgram so the rule can't drift. Poster is mandatory when any
// media is present; the video is optional (photo-only customs have none).
// Returns null when valid, else a human-readable reason.
export type MediaSnapshot = {
  customExerciseId: string | null;
  videoPath: string | null;
  posterPath: string | null;
};

export function mediaSnapshotError(
  userId: string,
  s: MediaSnapshot
): string | null {
  const hasMedia = s.videoPath !== null || s.posterPath !== null;
  if (!hasMedia) return null; // catalog exercise — no media

  if (s.customExerciseId === null) return "Missing custom exercise id";
  if (s.posterPath === null) return "Missing poster path";

  const prefix = `${userId}/exercise-videos/${s.customExerciseId}/`;
  if (!s.posterPath.startsWith(prefix)) return "Poster path outside owner folder";
  if (s.videoPath !== null && !s.videoPath.startsWith(prefix)) {
    return "Video path outside owner folder";
  }
  return null;
}
```

- [ ] **Step 4: Run the smoke test to verify it passes**

Run: `npx tsx scripts/smoke-media-snapshot.ts`
Expected: PASS — ends with `✓ media-snapshot smoke: ...`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/media-snapshot.ts scripts/smoke-media-snapshot.ts
git commit -m "Add shared media-snapshot path validator + smoke (poster-only allowed)"
```

---

## Task 5: Wire the validator into both actions; allow video-less creates

**Files:**
- Modify: `src/app/actions/custom-exercise.ts`
- Modify: `src/app/actions/program.ts`

- [ ] **Step 1: Make `videoPath` nullable in `createCustomExercise` and use the validator**

In `src/app/actions/custom-exercise.ts`:

Add the import near the top:
```ts
import { mediaSnapshotError } from "@/lib/media-snapshot";
```

In `CreateSchema`, change:
```ts
    videoPath: z.string().min(1).max(500),
```
to:
```ts
    videoPath: z.string().min(1).max(500).nullable(),
```

Replace the inline prefix check in `createCustomExercise`:
```ts
  // Both objects must sit under the caller's own folder (defense-in-depth on top
  // of storage RLS) — the folder id == the row id so delete/GC is deterministic.
  const prefix = `${user.id}/exercise-videos/${v.customExerciseId}/`;
  if (!v.videoPath.startsWith(prefix) || !v.posterPath.startsWith(prefix)) {
    throw new Error("Invalid video path");
  }
```
with:
```ts
  // Paths must sit under the caller's own folder (folder id == row id). Poster is
  // always present; video is optional for photo-only customs.
  const snapErr = mediaSnapshotError(user.id, {
    customExerciseId: v.customExerciseId,
    videoPath: v.videoPath,
    posterPath: v.posterPath,
  });
  if (snapErr) throw new Error(snapErr);
```

The insert already maps `video_path: v.videoPath` — now `string | null`, which the regenerated type accepts. The rollback line `remove([v.videoPath, v.posterPath])` must skip a null video; replace:
```ts
  if (error) {
    await supabase.storage.from(VIDEO_BUCKET).remove([v.videoPath, v.posterPath]);
    throw error;
  }
```
with:
```ts
  if (error) {
    const paths = [v.posterPath, ...(v.videoPath ? [v.videoPath] : [])];
    await supabase.storage.from(VIDEO_BUCKET).remove(paths);
    throw error;
  }
```

- [ ] **Step 2: Use the validator in `addExerciseToProgram` (allow poster-only)**

In `src/app/actions/program.ts`:

Add the import near the top:
```ts
import { mediaSnapshotError } from "@/lib/media-snapshot";
```

Replace the inline media check:
```ts
  if (parsed.videoPath !== null || parsed.posterPath !== null) {
    const prefix = `${user.id}/exercise-videos/${parsed.customExerciseId}/`;
    if (
      parsed.customExerciseId === null ||
      parsed.videoPath === null ||
      parsed.posterPath === null ||
      !parsed.videoPath.startsWith(prefix) ||
      !parsed.posterPath.startsWith(prefix)
    ) {
      throw new Error("Invalid video path");
    }
  }
```
with:
```ts
  // A snapshotted custom must arrive scoped to its source library entry: poster
  // mandatory when any media is present, video optional (photo-only customs).
  const snapErr = mediaSnapshotError(user.id, {
    customExerciseId: parsed.customExerciseId,
    videoPath: parsed.videoPath,
    posterPath: parsed.posterPath,
  });
  if (snapErr) throw new Error(snapErr);
```

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/app/actions/custom-exercise.ts src/app/actions/program.ts
git commit -m "Actions: allow video-less custom creates + poster-only snapshots via shared validator"
```

---

## Task 6: Add `extractImagePoster` (canvas bake from an `<img>`)

**Files:**
- Modify: `src/lib/extract-video-poster.ts`

- [ ] **Step 1: Refactor the shared canvas bake out of `extractPoster`**

In `src/lib/extract-video-poster.ts`, replace the body of `extractPoster` after the `await seekTo(...)` line (the `sw`/`sh`/canvas/`toBlob` block) with a call to a shared helper, and add the helper + `extractImagePoster`. The full file becomes:

```ts
// Extract a still poster JPEG cropped to a reframe rect, drawn from a LOCAL blob
// URL BEFORE upload so the canvas is never tainted. Mirrors body/photo-capture.
import type { ReframeRect } from "./video-upload";

export function seekTo(video: HTMLVideoElement, sec: number): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      video.removeEventListener("seeked", done);
      resolve();
    };
    video.addEventListener("seeked", done);
    try {
      video.currentTime = sec;
    } catch {
      video.removeEventListener("seeked", done);
      resolve();
    }
  });
}

// Draw `rect` (normalized 0..1 in source coords) of a video/image into a JPEG
// File, scaled so its longest side is <= maxSide.
async function drawCropToJpeg(
  source: CanvasImageSource,
  sourceW: number,
  sourceH: number,
  rect: ReframeRect,
  maxSide: number
): Promise<File> {
  const cropW = rect.w * sourceW;
  const cropH = rect.h * sourceH;
  const scale = Math.min(1, maxSide / Math.max(cropW, cropH));
  const dw = Math.max(1, Math.round(cropW * scale));
  const dh = Math.max(1, Math.round(cropH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(source, rect.x * sourceW, rect.y * sourceH, cropW, cropH, 0, 0, dw, dh);

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Poster encode failed"))),
      "image/jpeg",
      0.85
    )
  );
  return new File([blob], "poster.jpg", { type: "image/jpeg" });
}

export async function extractPoster(
  video: HTMLVideoElement,
  rect: ReframeRect,
  atSec: number,
  maxSide = 640
): Promise<File> {
  // Seek slightly past the trim start to dodge a black first frame; MUST await
  // 'seeked' before drawImage or we capture the wrong/black frame.
  await seekTo(video, atSec);
  return drawCropToJpeg(video, video.videoWidth, video.videoHeight, rect, maxSide);
}

// Bake the cropped square thumbnail from a loaded <img> (no seek needed).
export async function extractImagePoster(
  img: HTMLImageElement,
  rect: ReframeRect,
  maxSide = 640
): Promise<File> {
  return drawCropToJpeg(img, img.naturalWidth, img.naturalHeight, rect, maxSide);
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/extract-video-poster.ts
git commit -m "extract-poster: share canvas bake; add extractImagePoster for photos"
```

---

## Task 7: `ImageReframer` component

**Files:**
- Create: `src/components/image-reframer.tsx`

- [ ] **Step 1: Implement the component**

Create `src/components/image-reframer.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { extractImagePoster } from "@/lib/extract-video-poster";
import { MAX_ZOOM, baseDims, clampView, rectFor } from "@/lib/reframe";

// Square reframe over a LOCAL image File: pan/pinch/zoom into a 1:1 crop, then
// bake the visible square to a JPEG poster. Mirrors VideoCropper's stage gestures
// (shared reframe geometry) minus the video/trim machinery.
export function ImageReframer({
  file,
  onConfirm,
  onCancel,
}: {
  file: File;
  onConfirm: (poster: File) => void;
  onCancel: () => void;
}) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  const imgRef = useRef<HTMLImageElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState({ cx: 0.5, cy: 0.5 });
  const [busy, setBusy] = useState(false);

  const zoomRef = useRef(1);
  const centerRef = useRef({ cx: 0.5, cy: 0.5 });
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);

  const ready = natural.w > 0 && natural.h > 0;
  const sa = ready ? natural.w / natural.h : 1;
  const target = 1; // square
  const rect = ready ? rectFor(target, sa, zoom, center) : null;

  function applyView(nextZoom: number, nextCenter: { cx: number; cy: number }) {
    const { zoom: z, center: c } = clampView(target, sa, nextZoom, nextCenter);
    zoomRef.current = z;
    centerRef.current = c;
    setZoom(z);
    setCenter(c);
  }

  function onLoad() {
    const img = imgRef.current;
    if (!img) return;
    setNatural({ w: img.naturalWidth, h: img.naturalHeight });
  }

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: zoomRef.current };
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const stage = stageRef.current;
    if (!stage) return;
    const { width: sw, height: sh } = stage.getBoundingClientRect();

    if (pointers.current.size >= 2 && pinch.current) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const ratio = dist / (pinch.current.dist || 1);
      applyView(pinch.current.zoom * ratio, centerRef.current);
      return;
    }

    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const { baseW, baseH } = baseDims(target, sa);
    const cw = baseW / zoomRef.current;
    const ch = baseH / zoomRef.current;
    applyView(zoomRef.current, {
      cx: centerRef.current.cx - (dx / sw) * cw,
      cy: centerRef.current.cy - (dy / sh) * ch,
    });
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }

  async function confirm() {
    const img = imgRef.current;
    if (!img || !rect || busy) return;
    setBusy(true);
    try {
      const poster = await extractImagePoster(img, rect);
      onConfirm(poster);
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white">
      <div className="flex items-center justify-between p-3">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          className="h-9 w-9 flex items-center justify-center rounded-full bg-white/10 outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
        >
          <X className="w-5 h-5" />
        </button>
        <span className="text-sm">Reframe photo</span>
        <button
          type="button"
          onClick={confirm}
          disabled={busy || !ready}
          aria-label="Use photo"
          className={cn(
            "h-9 px-4 flex items-center gap-1.5 rounded-full bg-accent text-accent-foreground text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]",
            (busy || !ready) && "opacity-50"
          )}
        >
          <Check className="w-4 h-4" /> {busy ? "Saving…" : "Use"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col items-center gap-5">
        <div
          ref={stageRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="relative mx-auto w-full max-w-sm overflow-hidden rounded-xl bg-black touch-none select-none cursor-move"
          style={{ aspectRatio: 1 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={url}
            alt=""
            onLoad={onLoad}
            draggable={false}
            style={
              rect
                ? {
                    position: "absolute",
                    width: `${(1 / rect.w) * 100}%`,
                    height: `${(1 / rect.h) * 100}%`,
                    left: `${-(rect.x / rect.w) * 100}%`,
                    top: `${-(rect.y / rect.h) * 100}%`,
                    maxWidth: "none",
                    objectFit: "cover",
                  }
                : { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }
            }
          />
        </div>

        <label className="flex w-full max-w-sm items-center gap-3 text-xs text-white/70">
          <span className="w-10 shrink-0">Zoom</span>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => applyView(parseFloat(e.target.value), centerRef.current)}
            className="flex-1 accent-[var(--color-accent)]"
            aria-label="Zoom"
          />
        </label>
        <p className="max-w-sm text-[11px] text-white/50">
          Drag to reposition · pinch or the slider to zoom. The square is your thumbnail.
        </p>
      </div>
    </div>
  );
}
```

> Note: the inline `style` here is the literal expansion of `cropStyle(rect)` (`src/lib/video-upload.ts`) — kept inline only because the `<img>` needs a no-op full-frame fallback before `onLoad`. If you prefer, import and call `cropStyle(rect)` instead and drop the fallback branch (it returns full-frame for a null rect).

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/image-reframer.tsx
git commit -m "Add ImageReframer (square pan/zoom reframe for photo thumbnails)"
```

(Manual verification happens end-to-end in Task 10.)

---

## Task 8: `VideoRecorder` component (in-app 80s recorder)

**Files:**
- Create: `src/components/video-recorder.tsx`

- [ ] **Step 1: Implement the component**

Create `src/components/video-recorder.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { SwitchCamera, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDialog } from "@/lib/use-dialog";
import {
  MAX_VIDEO_SECONDS,
  RECORD_BITS_PER_SECOND,
  pickRecorderMimeType,
  recorderExt,
} from "@/lib/video-upload";

function fmt(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// In-app camera recorder. Records video-only (player is muted; no mic prompt),
// hard auto-stops at MAX_VIDEO_SECONDS, and hands the recorded File to the
// parent (which opens VideoCropper). Falls back to file upload when the camera
// or MediaRecorder is unavailable.
export function VideoRecorder({
  onConfirm,
  onCancel,
  onFallback,
}: {
  onConfirm: (file: File) => void;
  onCancel: () => void;
  onFallback: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const dialogRef = useDialog<HTMLDivElement>(true, onCancel);

  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const supported =
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    typeof MediaRecorder !== "undefined";

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }
  function clearTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  // Acquire (or re-acquire on flip) the camera stream.
  useEffect(() => {
    if (!supported) {
      setError("Recording isn't supported on this device — upload a clip instead.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        setError("Camera unavailable — upload a clip instead.");
      }
    })();
    return () => {
      cancelled = true;
      stopStream();
    };
  }, [facing, supported]);

  // Unmount safety.
  useEffect(() => () => {
    clearTimer();
    stopStream();
  }, []);

  // Hard cap: auto-stop at MAX_VIDEO_SECONDS.
  useEffect(() => {
    if (recording && elapsed >= MAX_VIDEO_SECONDS) stopRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, recording]);

  function startRecording() {
    const stream = streamRef.current;
    if (!stream) return;
    const mimeType = pickRecorderMimeType();
    chunksRef.current = [];
    const rec = new MediaRecorder(
      stream,
      mimeType
        ? { mimeType, videoBitsPerSecond: RECORD_BITS_PER_SECOND }
        : { videoBitsPerSecond: RECORD_BITS_PER_SECOND }
    );
    rec.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      clearTimer();
      const type = mimeType || "video/webm";
      const blob = new Blob(chunksRef.current, { type });
      const file = new File([blob], `recording.${recorderExt(mimeType)}`, { type });
      stopStream();
      onConfirm(file);
    };
    rec.start();
    recorderRef.current = rec;
    setRecording(true);
    setElapsed(0);
    timerRef.current = window.setInterval(() => setElapsed((e) => e + 1), 1000);
  }

  function stopRecording() {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    setRecording(false);
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Record video"
      tabIndex={-1}
      className="fixed inset-0 z-50 bg-black flex flex-col outline-none"
    >
      <div className="flex items-center justify-between p-3 text-white">
        <span className="text-sm tabular-nums">
          {recording ? `● ${fmt(elapsed)} / ${fmt(MAX_VIDEO_SECONDS)}` : "Record a clip"}
        </span>
        <div className="flex items-center gap-2">
          {!recording && !error ? (
            <button
              type="button"
              onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
              aria-label="Flip camera"
              className="h-9 w-9 flex items-center justify-center rounded-full bg-white/10"
            >
              <SwitchCamera className="w-5 h-5" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="h-9 w-9 flex items-center justify-center rounded-full bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
        {error ? (
          <p className="absolute inset-x-0 bottom-28 text-center text-sm text-white/80 px-6">
            {error}
          </p>
        ) : null}
      </div>

      <div className="p-5 flex items-center justify-center gap-6 text-white">
        {error ? (
          <button
            type="button"
            onClick={onFallback}
            className="h-12 px-5 rounded-full bg-accent text-accent-foreground text-sm font-medium"
          >
            Upload a clip instead
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onFallback}
              className="text-sm text-white/80"
            >
              Upload
            </button>
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              aria-label={recording ? "Stop recording" : "Start recording"}
              className={cn(
                "h-16 w-16 rounded-full border-4 border-white flex items-center justify-center",
                recording ? "bg-red-500/30" : "bg-white/20"
              )}
            >
              <span
                className={cn(
                  "bg-red-500 transition-all",
                  recording ? "h-6 w-6 rounded" : "h-10 w-10 rounded-full"
                )}
              />
            </button>
            <span className="w-10" />
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/video-recorder.tsx
git commit -m "Add VideoRecorder (in-app camera, hard 80s auto-stop, upload fallback)"
```

(Manual verification happens end-to-end in Task 10.)

---

## Task 9: Make `VideoCropper` robust to `MediaRecorder` clips (Infinity duration)

**Files:**
- Modify: `src/components/video-cropper.tsx`

- [ ] **Step 1: Resolve a missing/Infinity duration in `onLoadedMetadata`**

Some `MediaRecorder` blobs report `duration === Infinity` (or `NaN`) until the element is seeked to the end. In `src/components/video-cropper.tsx`, replace `onLoadedMetadata`:

```ts
  function onLoadedMetadata() {
    const v = videoRef.current;
    if (!v) return;
    setNatural({ w: v.videoWidth, h: v.videoHeight });
    const dur = Number.isFinite(v.duration) ? v.duration : 0;
    setDuration(dur);
    const end = Math.min(dur, MAX_VIDEO_SECONDS);
    setTrim({ startSec: 0, endSec: end });
    trimRef.current = { startSec: 0, endSec: end };
    v.muted = true;
    v.play().catch(() => {});
  }
```
with:
```ts
  function applyDuration(dur: number) {
    setDuration(dur);
    const end = Math.min(dur, MAX_VIDEO_SECONDS);
    setTrim({ startSec: 0, endSec: end });
    trimRef.current = { startSec: 0, endSec: end };
  }

  function onLoadedMetadata() {
    const v = videoRef.current;
    if (!v) return;
    setNatural({ w: v.videoWidth, h: v.videoHeight });
    if (Number.isFinite(v.duration) && v.duration > 0) {
      applyDuration(v.duration);
      v.muted = true;
      v.play().catch(() => {});
      return;
    }
    // MediaRecorder clips can report Infinity/NaN until seeked to the end.
    // Force the browser to resolve the real duration, then reset to the start.
    const onDurationChange = () => {
      if (Number.isFinite(v.duration) && v.duration > 0) {
        v.removeEventListener("durationchange", onDurationChange);
        applyDuration(v.duration);
        v.currentTime = 0;
        v.muted = true;
        v.play().catch(() => {});
      }
    };
    v.addEventListener("durationchange", onDurationChange);
    try {
      v.currentTime = 1e7; // jump past the end to trigger durationchange
    } catch {
      /* ignore */
    }
  }
```

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: exit 0.

- [ ] **Step 3: Manual — recorded clip trims correctly**

Verified end-to-end in Task 10 (record a clip → the trim timeline shows a real duration, not 0:00, and handles drag).

- [ ] **Step 4: Commit**

```bash
git add src/components/video-cropper.tsx
git commit -m "VideoCropper: resolve Infinity/NaN duration from MediaRecorder clips"
```

---

## Task 10: 3-way media chooser on the New custom exercise page

**Files:**
- Modify: `src/app/(app)/program/exercises/new/create-custom-exercise-client.tsx`

- [ ] **Step 1: Rewrite the client with photo + record + upload paths**

Replace the entire contents of `src/app/(app)/program/exercises/new/create-custom-exercise-client.tsx` with:

```tsx
"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Film, Pencil, Video } from "lucide-react";
import { cn, FOCUS_RING as RING } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { createCustomExercise } from "@/app/actions/custom-exercise";
import { VideoCropper, type CropperResult } from "@/components/video-cropper";
import { ImageReframer } from "@/components/image-reframer";
import { VideoRecorder } from "@/components/video-recorder";
import { MuscleBadge } from "@/components/muscle-badge";
import {
  MUSCLE_REGIONS,
  REGION_META,
  type MuscleRegion,
} from "@/lib/muscle-regions";
import { isLikelyImage, MAX_PHOTO_BYTES } from "@/lib/photo-upload";
import {
  MAX_VIDEO_BYTES,
  VIDEO_BUCKET,
  isLikelyVideo,
  videoContentType,
  videoExt,
} from "@/lib/video-upload";

type PhotoMedia = { kind: "photo"; poster: File };
type VideoMediaState = { kind: "video"; source: File; crop: CropperResult };
type Media = PhotoMedia | VideoMediaState;

export function CreateCustomExerciseClient({
  returnTo,
}: {
  returnTo: string | null;
}) {
  const router = useRouter();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [media, setMedia] = useState<Media | null>(null);
  const [muscles, setMuscles] = useState<Set<MuscleRegion>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();

  // Editor overlays + the file currently being edited.
  const [photoToReframe, setPhotoToReframe] = useState<File | null>(null);
  const [videoToCrop, setVideoToCrop] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);

  const posterFile = media?.kind === "photo" ? media.poster : media?.crop.poster ?? null;
  const posterUrl = useMemo(
    () => (posterFile ? URL.createObjectURL(posterFile) : null),
    [posterFile]
  );
  useEffect(() => {
    return () => {
      if (posterUrl) URL.revokeObjectURL(posterUrl);
    };
  }, [posterUrl]);

  function pickPhoto(file: File | null) {
    setError(null);
    if (!file) return;
    if (!isLikelyImage(file)) {
      setError("Pick an image file (jpg, png, webp, or heic).");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError(
        `Photo too large (${(file.size / 1024 / 1024).toFixed(0)} MB). Max ${
          MAX_PHOTO_BYTES / 1024 / 1024
        } MB.`
      );
      return;
    }
    setPhotoToReframe(file);
  }

  function pickVideo(file: File | null) {
    setError(null);
    if (!file) return;
    if (!isLikelyVideo(file)) {
      setError("Pick a video file (mp4, mov, or webm).");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setError(
        `Video too large (${(file.size / 1024 / 1024).toFixed(0)} MB). Max ${
          MAX_VIDEO_BYTES / 1024 / 1024
        } MB.`
      );
      return;
    }
    setVideoToCrop(file);
  }

  function toggleMuscle(r: MuscleRegion) {
    setMuscles((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });
  }

  const selectedRegions = [...muscles];
  const catalogMuscles = useMemo(() => {
    const s = new Set<string>();
    for (const r of muscles) for (const m of REGION_META[r].catalogMuscles) s.add(m);
    return [...s];
  }, [muscles]);

  function reEdit() {
    if (media?.kind === "photo") setPhotoToReframe(media.poster);
    else if (media?.kind === "video") setVideoToCrop(media.source);
  }

  function submit() {
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required.");
      return;
    }
    if (!media) {
      setError("Add a photo or video first.");
      return;
    }

    startSubmit(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Not signed in — try reloading.");
        return;
      }

      const id = crypto.randomUUID();
      const dir = `${user.id}/exercise-videos/${id}`;
      const posterPath = `${dir}/poster.jpg`;
      const uploaded: string[] = [];
      try {
        if (media.kind === "video") {
          const ext = videoExt(media.source);
          const videoPath = `${dir}/source.${ext}`;
          const up1 = await supabase.storage
            .from(VIDEO_BUCKET)
            .upload(videoPath, media.source, {
              contentType: videoContentType(media.source, ext),
              upsert: false,
            });
          if (up1.error) throw up1.error;
          uploaded.push(videoPath);

          const up2 = await supabase.storage
            .from(VIDEO_BUCKET)
            .upload(posterPath, media.crop.poster, {
              contentType: "image/jpeg",
              upsert: false,
            });
          if (up2.error) throw up2.error;
          uploaded.push(posterPath);

          await createCustomExercise({
            customExerciseId: id,
            name: trimmed,
            videoPath,
            posterPath,
            cropRect: media.crop.rect,
            trimStartSeconds: media.crop.trim.startSec,
            trimEndSeconds: media.crop.trim.endSec,
            aspectRatio: media.crop.aspect,
            muscles: catalogMuscles,
          });
        } else {
          const up = await supabase.storage
            .from(VIDEO_BUCKET)
            .upload(posterPath, media.poster, {
              contentType: "image/jpeg",
              upsert: false,
            });
          if (up.error) throw up.error;
          uploaded.push(posterPath);

          await createCustomExercise({
            customExerciseId: id,
            name: trimmed,
            videoPath: null,
            posterPath,
            cropRect: null,
            trimStartSeconds: null,
            trimEndSeconds: null,
            aspectRatio: 1,
            muscles: catalogMuscles,
          });
        }
      } catch (err) {
        if (uploaded.length) {
          await supabase.storage.from(VIDEO_BUCKET).remove(uploaded);
        }
        setError(err instanceof Error ? err.message : "Couldn't save the exercise.");
        return;
      }

      router.push(returnTo ?? "/program/exercises");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <label className="block space-y-1">
        <span className="block text-[11px] uppercase tracking-wide text-foreground-muted">
          Name
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          placeholder="e.g. Cable woodchop"
          className={cn(
            "w-full h-11 rounded-md bg-surface border border-border px-3 text-base",
            RING
          )}
        />
      </label>

      <div className="space-y-2">
        <span className="block text-[11px] uppercase tracking-wide text-foreground-muted">
          Media
        </span>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            pickPhoto(e.target.files?.[0] ?? null);
            if (photoInputRef.current) photoInputRef.current.value = "";
          }}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            pickVideo(e.target.files?.[0] ?? null);
            if (videoInputRef.current) videoInputRef.current.value = "";
          }}
        />
        {media && posterUrl ? (
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
            <span className="relative block h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={posterUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            </span>
            <div className="flex-1 min-w-0 text-xs text-foreground-muted">
              {media.kind === "video"
                ? `Clip ready · ${Math.round(media.crop.trim.endSec - media.crop.trim.startSec)}s`
                : "Photo ready"}
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <button
                type="button"
                onClick={reEdit}
                className={cn(
                  "inline-flex items-center gap-1 rounded text-xs text-foreground-muted hover:text-foreground",
                  RING
                )}
              >
                <Pencil className="w-3.5 h-3.5" /> Re-edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setMedia(null);
                  setError(null);
                }}
                className={cn(
                  "rounded text-xs text-foreground-muted hover:text-foreground",
                  RING
                )}
              >
                Replace
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className={cn(
                "w-full h-12 rounded-md border border-dashed border-border-strong text-sm text-foreground-muted flex items-center justify-center gap-1.5",
                RING
              )}
            >
              <Camera className="w-4 h-4" /> Add photo
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setRecording(true);
              }}
              className={cn(
                "w-full h-12 rounded-md border border-dashed border-border-strong text-sm text-foreground-muted flex items-center justify-center gap-1.5",
                RING
              )}
            >
              <Video className="w-4 h-4" /> Record video
              <span className="text-[11px] text-foreground-muted">· up to 80s</span>
            </button>
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              className={cn(
                "w-full h-12 rounded-md border border-dashed border-border-strong text-sm text-foreground-muted flex items-center justify-center gap-1.5",
                RING
              )}
            >
              <Film className="w-4 h-4" /> Upload video
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wide text-foreground-muted">
            Muscles worked
          </span>
          {selectedRegions.length > 0 ? (
            <MuscleBadge regions={selectedRegions} size={28} />
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {MUSCLE_REGIONS.map((r) => {
            const on = muscles.has(r.key);
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => toggleMuscle(r.key)}
                aria-pressed={on}
                className={cn(
                  "h-8 px-3 rounded-full text-xs border transition-colors",
                  RING,
                  on
                    ? "bg-accent text-accent-foreground border-accent"
                    : "border-border bg-surface text-foreground-muted"
                )}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className={cn(
          "h-12 w-full rounded-md bg-accent text-accent-foreground font-medium text-sm",
          RING,
          submitting && "opacity-50"
        )}
      >
        {submitting ? "Saving…" : "Save exercise"}
      </button>

      {photoToReframe ? (
        <ImageReframer
          file={photoToReframe}
          onConfirm={(poster) => {
            setMedia({ kind: "photo", poster });
            setPhotoToReframe(null);
          }}
          onCancel={() => setPhotoToReframe(null)}
        />
      ) : null}

      {videoToCrop ? (
        <VideoCropper
          file={videoToCrop}
          onConfirm={(crop) => {
            setMedia({ kind: "video", source: videoToCrop, crop });
            setVideoToCrop(null);
          }}
          onCancel={() => setVideoToCrop(null)}
        />
      ) : null}

      {recording ? (
        <VideoRecorder
          onConfirm={(file) => {
            setRecording(false);
            pickVideo(file);
          }}
          onCancel={() => setRecording(false)}
          onFallback={() => {
            setRecording(false);
            videoInputRef.current?.click();
          }}
        />
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: exit 0.

- [ ] **Step 3: Manual — all three media paths**

`npm run dev`, sign in as `claude-test@example.com`, go to `/program/exercises/new`:
1. **Add photo** → pick an image → square reframe (drag/zoom) → "Use" → "Photo ready" preview shows your square crop. Name it, tag a muscle, "Save exercise" → lands on `/program/exercises` with the new exercise showing your photo as its thumbnail.
2. **Record video** → camera opens → record a few seconds → tap stop (and separately confirm it auto-stops at 1:20 if you let it run) → reframe+trim editor shows a real duration → "Use" → "Clip ready · Ns" → Save → exercise plays the clip.
3. **Upload video** → unchanged from before → still works.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/program/exercises/new/create-custom-exercise-client.tsx"
git commit -m "New custom exercise: photo / record / upload media chooser"
```

---

## Task 11: Sign posters for ALL program-exercise media rows (`attachMediaUrls`)

**Files:**
- Modify: `src/lib/queries.ts`

- [ ] **Step 1: Find every caller of `attachVideoUrls`**

Run: `npx rg -n "attachVideoUrls" src/lib/queries.ts`
Expected: the definition + each call site. You will rename all of them in Step 2.

- [ ] **Step 2: Replace the function so it signs every poster, not just video rows**

In `src/lib/queries.ts`, replace `attachVideoUrls`:

```ts
async function attachVideoUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  exercises: ProgramExercise[]
): Promise<void> {
  const withVideo = exercises.filter((e) => e.video_path && e.poster_path);
  if (withVideo.length === 0) return;
  const videoPaths = withVideo.map((e) => e.video_path as string);
  const posterPaths = withVideo.map((e) => e.poster_path as string);
  const [video, poster] = await Promise.all([
    supabase.storage.from(VIDEO_BUCKET).createSignedUrls(videoPaths, VIDEO_URL_TTL),
    supabase.storage.from(VIDEO_BUCKET).createSignedUrls(posterPaths, VIDEO_URL_TTL),
  ]);
  withVideo.forEach((e, i) => {
    e.video_signed_url = video.data?.[i]?.signedUrl ?? null;
    e.poster_signed_url = poster.data?.[i]?.signedUrl ?? null;
  });
}
```
with:
```ts
// Sign the poster for EVERY exercise that has one (video and photo-only customs),
// and the video only for rows that have one. Mutates the signed-URL fields in
// place. Index-aligned per filtered list.
async function attachMediaUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  exercises: ProgramExercise[]
): Promise<void> {
  const withPoster = exercises.filter((e) => e.poster_path);
  if (withPoster.length > 0) {
    const posterSigned = await supabase.storage
      .from(VIDEO_BUCKET)
      .createSignedUrls(
        withPoster.map((e) => e.poster_path as string),
        VIDEO_URL_TTL
      );
    withPoster.forEach((e, i) => {
      e.poster_signed_url = posterSigned.data?.[i]?.signedUrl ?? null;
    });
  }

  const withVideo = exercises.filter((e) => e.video_path);
  if (withVideo.length > 0) {
    const videoSigned = await supabase.storage
      .from(VIDEO_BUCKET)
      .createSignedUrls(
        withVideo.map((e) => e.video_path as string),
        VIDEO_URL_TTL
      );
    withVideo.forEach((e, i) => {
      e.video_signed_url = videoSigned.data?.[i]?.signedUrl ?? null;
    });
  }
}
```

- [ ] **Step 3: Rename every call site**

For each `attachVideoUrls(` call found in Step 1, change it to `attachMediaUrls(`. (Same arguments.)

Run: `npx rg -n "attachVideoUrls" src/`
Expected: no matches.

- [ ] **Step 4: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/queries.ts
git commit -m "queries: attachMediaUrls signs posters for all media rows (incl. photo-only)"
```

---

## Task 12: Prefer the signed poster for program-exercise thumbnails

**Files:**
- Modify: `src/app/(app)/program/page.tsx`
- Modify: `src/app/(app)/workout/[sessionId]/page.tsx`
- Sweep + modify as needed: `src/app/(app)/history/[sessionId]/*`, day-detail, library drilldown

- [ ] **Step 1: Program hub thumbnail**

In `src/app/(app)/program/page.tsx`, in the exercise row, change:
```tsx
                <ExerciseThumb
                  url={ex.image_url}
                  alt={ex.name}
                  video={video}
                  videoPath={ex.video_path}
                />
```
to:
```tsx
                <ExerciseThumb
                  url={ex.poster_signed_url ?? ex.image_url}
                  alt={ex.name}
                  video={video}
                  videoPath={ex.video_path}
                />
```

- [ ] **Step 2: Workout logging thumbnail**

In `src/app/(app)/workout/[sessionId]/page.tsx`, change:
```ts
      imageUrl: ex.image_url,
```
to:
```ts
      imageUrl: ex.poster_signed_url ?? ex.image_url,
```
(`mediaKind: ex.video_path ? "video" : "image"` stays — a photo-only row is `"image"` with the signed poster as `imageUrl`.)

- [ ] **Step 3: Sweep the other program-exercise render sites**

Run: `npx rg -n "image_url" src/app/\(app\)/history src/app/\(app\)/program/library`
For any spot that renders a program-exercise (or snapshotted-session) thumbnail directly from `image_url` while the row also carries `poster_signed_url`, apply the same `poster_signed_url ?? image_url` preference. If a path doesn't sign posters (e.g. it builds its own query), confirm whether photo-only customs can appear there; if they can, route it through `attachMediaUrls` too. Note in the commit which files you touched (or "none needed").

- [ ] **Step 4: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: exit 0.

- [ ] **Step 5: Manual — photo-only custom shows its photo everywhere**

Using the photo-only exercise created in Task 10: add it to the active program (Task 13 covers the add flow — do this step after Task 13), then confirm the `/program` hub row and the `/workout/[id]` logging card both show the photo thumbnail (NOT the app logo).

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/program/page.tsx" "src/app/(app)/workout/[sessionId]/page.tsx"
git commit -m "Render: prefer signed poster over image_url for program-exercise thumbnails"
```

---

## Task 13: Snapshot photo-only customs durably in the add-to-program flow

**Files:**
- Modify: `src/app/(app)/program/add/add-exercise-client.tsx`

- [ ] **Step 1: Build a durable snapshot for photo-only customs**

In `src/app/(app)/program/add/add-exercise-client.tsx`, replace the snapshot section. Change:
```ts
    const video = entry.video;
    startSubmit(async () => {
      try {
        await addExerciseToProgram({
          programDayId,
          name: trimmedName,
          // For video customs, image_url is just a fallback — playback is driven
          // by video_path; never store the (expiring) signed poster URL here.
          imageUrl: video ? CUSTOM_IMG : imgUrl,
          sets: setsN,
          baseReps: repsN,
          startWeight: startN,
          increment: incN,
          tracked,
          note: note.trim() === "" ? null : note.trim(),
          progressionWeeks: progN,
          kind,
          targetSeconds: targetSecondsN,
          redirectWeek,
          returnTo: returnTo ?? undefined,
          customExerciseId: video?.customExerciseId ?? null,
          videoPath: video?.videoPath ?? null,
          posterPath: video?.posterPath ?? null,
          cropRect: video?.rect ?? null,
          trimStartSeconds: video?.trim?.startSec ?? null,
          trimEndSeconds: video?.trim?.endSec ?? null,
          aspectRatio: video?.aspect ?? null,
          muscles: entry.custom ? entry.primary : [],
        });
```
to:
```ts
    const video = entry.video;
    // Photo-only customs have no video but a durable poster_path. Snapshot the
    // poster path + custom id so the program row keeps showing the photo (a
    // signed URL would expire). For video customs, image_url is just a fallback.
    const isCustom = !!entry.custom;
    const posterPath = video?.posterPath ?? (isCustom ? entry.posterPath ?? null : null);
    const customId = video?.customExerciseId ?? (isCustom ? entry.id : null);
    const hasCustomMedia = !!video || (isCustom && !!posterPath);
    startSubmit(async () => {
      try {
        await addExerciseToProgram({
          programDayId,
          name: trimmedName,
          imageUrl: hasCustomMedia ? CUSTOM_IMG : imgUrl,
          sets: setsN,
          baseReps: repsN,
          startWeight: startN,
          increment: incN,
          tracked,
          note: note.trim() === "" ? null : note.trim(),
          progressionWeeks: progN,
          kind,
          targetSeconds: targetSecondsN,
          redirectWeek,
          returnTo: returnTo ?? undefined,
          customExerciseId: customId,
          videoPath: video?.videoPath ?? null,
          posterPath,
          cropRect: video?.rect ?? null,
          trimStartSeconds: video?.trim?.startSec ?? null,
          trimEndSeconds: video?.trim?.endSec ?? null,
          aspectRatio: video?.aspect ?? null,
          muscles: isCustom ? entry.primary : [],
        });
```

- [ ] **Step 2: Fix the preview labels for photo-only customs**

In the same file, in the header preview block, change:
```tsx
          <p className="text-sm font-medium">
            {entry.custom ? (entry.video ? entry.name : "Custom exercise") : entry.name}
          </p>
          <p className="text-[11px] text-foreground-muted truncate">
            {entry.custom
              ? entry.video
                ? "Custom video"
                : "Using app logo"
              : [entry.equipment, entry.primary[0]]
                  .filter(Boolean)
                  .join(" · ")}
          </p>
```
to:
```tsx
          <p className="text-sm font-medium">{entry.name}</p>
          <p className="text-[11px] text-foreground-muted truncate">
            {entry.custom
              ? entry.video
                ? "Custom video"
                : "Custom photo"
              : [entry.equipment, entry.primary[0]]
                  .filter(Boolean)
                  .join(" · ")}
          </p>
```

- [ ] **Step 3: Show the photo thumbnail in the add preview**

In the same preview block, the `ExerciseMedia` already receives `imageUrl={imgUrl}` where `imgUrl = imageForCatalogEntry(entry)` resolves to the signed poster for photo-only customs (via `posterUrl`). Confirm the line reads:
```tsx
        <ExerciseMedia
          imageUrl={imgUrl}
          poster={entry.video ? entry.posterUrl ?? null : null}
          alt={entry.name}
          size={64}
        />
```
No change needed — verify only. (Photo-only: `poster` is null, `imageUrl` is the signed poster → the photo shows.)

- [ ] **Step 4: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: exit 0.

- [ ] **Step 5: Manual — add a photo-only custom to a program**

`npm run dev`, signed in as `claude-test@example.com`: open `/program/exercises`, tap the photo-only exercise from Task 10 → its detail → add it to a day (the add flow). Confirm: the add-config preview shows the photo + "Custom photo"; after saving, the `/program` hub row shows the photo (this also satisfies Task 12 Step 5).

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/program/add/add-exercise-client.tsx"
git commit -m "Add-to-program: snapshot photo-only customs durably (poster_path) + labels"
```

---

## Task 14: Copy tweaks (subtitle + empty state)

**Files:**
- Modify: `src/app/(app)/program/exercises/new/page.tsx`
- Modify: `src/app/(app)/program/exercises/exercise-library.tsx`

- [ ] **Step 1: Page subtitle**

In `src/app/(app)/program/exercises/new/page.tsx`, change:
```tsx
          <p className="text-xs text-foreground-muted">
            Upload a clip, reframe &amp; trim it, tag the muscles.
          </p>
```
to:
```tsx
          <p className="text-xs text-foreground-muted">
            Add a photo or video clip, reframe it, tag the muscles.
          </p>
```

- [ ] **Step 2: Library empty-state copy**

In `src/app/(app)/program/exercises/exercise-library.tsx`, change:
```tsx
          <p className="text-sm text-foreground-muted">
            No custom exercises yet — tap New to create one from a video.
          </p>
```
to:
```tsx
          <p className="text-sm text-foreground-muted">
            No custom exercises yet — tap New to create one from a photo or video.
          </p>
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/program/exercises/new/page.tsx" "src/app/(app)/program/exercises/exercise-library.tsx"
git commit -m "Copy: reflect photo + video in new-exercise subtitle and library empty state"
```

---

## Task 15: Full verification + docs

**Files:**
- Modify: `.claude/sessions.md` (prepend a session entry; keep only the latest 3)

- [ ] **Step 1: Run all checks**

Run:
```bash
npm run typecheck && npm run lint && npx tsx scripts/smoke-reframe.ts && npx tsx scripts/smoke-media-snapshot.ts && npx tsx scripts/smoke-library.ts && npm run build
```
Expected: typecheck exit 0; lint 0 errors; both new smokes `✓`; smoke-library `✓`; production build green.

- [ ] **Step 2: Full manual matrix (test account)**

Signed in as `claude-test@example.com`, confirm in one pass:
- (a) Photo-only create → square reframe → save → thumbnail is the photo in the library.
- (b) Add that photo-only exercise to the active program → `/program` hub + `/workout/[id]` show the photo (not the app logo).
- (c) Record video → auto-stops at 1:20 → reframe+trim shows a real duration → save → plays.
- (d) Upload video (regression) → reframe+trim → save → plays.
- (e) Re-open an existing video custom's detail (regression on the reframe refactor) → still plays.
- (f) Camera-denied path: deny permission when recording → "Upload a clip instead" appears and works.

- [ ] **Step 3: Update the session log**

Prepend a new dated entry to `.claude/sessions.md` summarizing this work (photo + recorded-clip custom exercises; nullable `video_path`; `reframe.ts` + `media-snapshot.ts` + smokes; `ImageReframer` + `VideoRecorder`; `attachMediaUrls`; poster-preferring thumbnails; the migration `20260614000000`). Keep only the latest 3 sessions.

- [ ] **Step 4: Commit**

```bash
git add .claude/sessions.md
git commit -m "Docs: session log for photo + recorded-clip custom exercises"
```

- [ ] **Step 5: Finish the branch**

Use the `superpowers:finishing-a-development-branch` skill to decide merge / PR / cleanup.

---

## Notes for the implementer

- **DB env required.** Tasks 1, 5, 13 and the manual checks need a linked Supabase project (`npx supabase db push`, `npm run db:types`). If this checkout has none, stop at Task 1 Step 2 and tell the user.
- **Don't hand-edit `database.types.ts`** — only `npm run db:types` regenerates it.
- **Don't touch progression math or `planned_*` snapshotting** — out of scope.
- **iOS caveat to watch in manual testing:** `MediaRecorder` on iOS Safari emits mp4; Chrome/Android emits webm. Task 9 handles the webm "Infinity duration" case — verify recorded clips trim on whatever browser you test.
