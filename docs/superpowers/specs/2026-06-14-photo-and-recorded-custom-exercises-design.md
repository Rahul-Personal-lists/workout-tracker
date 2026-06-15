# Photo + recorded-clip custom exercises — design

- **Date:** 2026-06-14
- **Status:** Approved (pending spec review)
- **Surface:** `/program/exercises/new` ("New custom exercise") + the custom-exercise read/add/render paths

## Goal

Extend custom exercises beyond "upload a video clip" to cover three new entry points the user asked for:

1. **Create an exercise with just a photo** — the photo is the thumbnail; no video.
2. **Upload media from the phone** — pick a photo (or video) from the device library/camera.
3. **Record a clip in-app, up to 80s**, then run it through the existing reframe + trim flow.

## Background — current state

- The page (`src/app/(app)/program/exercises/new/create-custom-exercise-client.tsx`) has a single media slot: `<input accept="video/*">` → `VideoCropper` (reframe + trim) → `extractPoster` → uploads `source.<ext>` + `poster.jpg` → `createCustomExercise`.
- `custom_exercises` (migration `20260606000000`) has **`video_path NOT NULL`** and **`poster_path NOT NULL`**; `crop_rect` / `trim_*` / `aspect_ratio` already nullable.
- Reframe mechanics live in `VideoCropper` (`src/components/video-cropper.tsx`, video-specific) plus the reusable `cropStyle` (`src/lib/video-upload.ts`) and `extractPoster` (`src/lib/extract-video-poster.ts`).
- A camera-capture pattern already exists in `src/app/(app)/body/photo-capture.tsx` (`getUserMedia` lifecycle).
- Custom rows surface as `CatalogEntry` via `customToCatalogEntry` (`src/lib/exercise-catalog.ts`), which **already degrades gracefully** to "poster as thumbnail, no player" when there is no signed video URL — so a photo-only entry mostly fits the existing read path.
- Limits: `MAX_VIDEO_BYTES = 50 MB`, `MAX_VIDEO_SECONDS = 30` (the trim cap).

## Decisions

| Question | Decision |
| --- | --- |
| Photo reframe? | **Square reframe step** (pan/zoom-to-square), not use-as-is. |
| Recording mechanism? | **In-app recorder** (`getUserMedia` + `MediaRecorder`) with a **hard auto-stop at 80s**. |
| Photo storage | **Bake** the square crop into `poster.jpg`; do not keep the original (no post-save re-edit exists for videos either — YAGNI). |
| Photo vs video | **Mutually exclusive** — one media per exercise. |
| `MAX_VIDEO_SECONDS` | 30 → **80** (uniform: trim cap + recorder stop). |
| `MAX_VIDEO_BYTES` | 50 MB → **150 MB** (an 80s phone upload can exceed 50 MB; in-app recordings stay ~25 MB). Tradeoff accepted: large uploads slow on cellular. |
| Recorder audio | **None** (player is muted; dodges mic permission). |

## UX flow

The "Add a video clip" button becomes a **3-way media chooser** (collapses to the existing "ready" preview card once media is chosen):

```
MEDIA
  📷  Add photo                  → OS photo picker → square reframe → thumbnail
  ⏺  Record video  (up to 80s)  → in-app recorder → reframe & trim
  🎬  Upload video               → file picker → reframe & trim (existing)
```

- **Add photo**: `<input accept="image/*">` (on mobile offers library + take-photo) → `ImageReframer` (square) → baked JPEG held in client state as the poster. "Re-edit" reopens the reframer (original `File` kept in memory during the session); "Replace" re-picks.
- **Record video**: `VideoRecorder` overlay → on confirm, hands the recorded `File` to the existing `VideoCropper`.
- **Upload video**: unchanged.

Photo path has **no trim timeline**. Submit:
- **Photo-only**: upload `poster.jpg` only → `createCustomExercise({ videoPath: null, posterPath, cropRect: null, trim: null, aspectRatio: null, muscles })`.
- **Video**: unchanged (uploads source + poster).

## Data model

New migration `supabase/migrations/<ts>_custom_exercise_photo.sql`:

```sql
alter table public.custom_exercises alter column video_path drop not null;
```

- `poster_path` stays `NOT NULL` — every exercise has a thumbnail.
- Photo-only row: `video_path = NULL`, `poster_path = {uid}/exercise-videos/{id}/poster.jpg`, `crop_rect/trim_*/aspect_ratio = NULL`.
- Keep the `exercise-videos/` storage prefix (internal; renaming forks path-validation against existing rows).

After migration: `npx supabase db push && npm run db:types`.

## New components / libs

- **`src/components/image-reframer.tsx`** — pan/zoom-to-square editor over an `<img>`; bakes the visible square to a JPEG `File` via canvas (mirrors `extract-video-poster.ts`, image-sourced). Output aspect = 1.
- **`src/components/video-recorder.tsx`** — `getUserMedia({ video: { facingMode }, audio: false })` + `MediaRecorder`. Live `MM:SS / 1:20` countdown, **hard auto-stop at 80s**, rear camera + flip toggle, feature-detected mime (`MediaRecorder.isTypeSupported` → mp4 else webm) and `videoBitsPerSecond ≈ 2.5 Mbps`. Assembles chunks into a `File` (proper name/type) and hands it to `VideoCropper`. Camera unsupported/denied → fall back to the upload `<input>` with a message.
- **Reframe reuse**: extract the pan/zoom/pinch math (`rectFor` / `applyView` / pointer handlers) from `VideoCropper` into a shared **`useReframe`** hook used by both cropper UIs, so preview stays pixel-identical (`cropStyle` already shared). **Fallback** if the refactor looks risky mid-build: `ImageReframer` duplicates ~50 lines and `VideoCropper` is left untouched.
- Helper to bake an image crop: extend `extract-video-poster.ts` or add `extract-image-poster.ts` (`drawImage` from `<img>` with the rect → JPEG `File`).

## Integration changes ("don't-break-it" set)

- **`src/lib/video-upload.ts`**: `MAX_VIDEO_SECONDS` → 80; `MAX_VIDEO_BYTES` → 150 MB. Add recorder mime/bitrate helpers as needed.
- **`src/components/video-cropper.tsx`**: in `onLoadedMetadata`, handle `duration === Infinity || NaN` (seek-to-large-time, await `durationchange`, reset) so the trim timeline works on `MediaRecorder` clips.
- **`src/app/actions/custom-exercise.ts`**: `videoPath` nullable in `CreateSchema`; insert `video_path: null` for photos. Keep the per-user path-prefix check on `posterPath` (and on `videoPath` when present).
- **`src/lib/queries.ts`**:
  - `getCustomExercises`: sign the **poster always**; sign the **video only when `video_path` is set** (don't pass nulls to `createSignedUrls`).
  - Rename `attachVideoUrls` → **`attachMediaUrls`**: sign posters for **all** rows with `poster_path` (not just video rows); sign videos for rows with `video_path`.
- **`src/lib/exercise-catalog.ts`**: add `posterPath?: string` to `CatalogEntry`, populated in `customToCatalogEntry` (`posterPath: c.poster_path`) — the durable path the add-flow snapshots for photo-only. (`imageForCatalogEntry` already prefers `posterUrl`.)
- **`src/app/(app)/program/add/add-exercise-client.tsx`**: snapshot photo-only customs **durably** — `posterPath = entry.posterPath ?? video?.posterPath`, `customExerciseId = video?.customExerciseId ?? (entry.custom ? entry.id : null)`, `videoPath = video?.videoPath ?? null`, `imageUrl = (video || photo-only custom) ? CUSTOM_IMG : imgUrl`. Update label copy ("Custom video" → "Custom photo"/"Custom video").
- **`src/app/actions/program.ts`** (`addExerciseToProgram`): relax validation so poster-only (video-less) snapshots pass — when any media present, require `customExerciseId` + `posterPath` under the user prefix; `videoPath` optional (prefix-checked only when present).
- **Render sites** — prefer the signed poster for the static thumbnail (`poster_signed_url ?? image_url`) so photo-only customs show the photo, not the app logo:
  - `src/app/(app)/program/page.tsx` (hub thumbnail `url=`).
  - `src/app/(app)/workout/[sessionId]/page.tsx` (`imageUrl:` mapping) — `exercise-card.tsx` consumes it.
  - **Sweep** history detail, day-detail, and the library drilldown for the same `image_url`-only thumbnail pattern.
- **Copy**: page subtitle ("Upload a clip…" → "Add a photo or video clip…"); `exercise-library.tsx` empty-state ("from a video" → "from a photo or video").

## Edge cases / error handling

- Camera unsupported/denied → upload fallback with a message (mirror `photo-capture.tsx`).
- Oversized / too-short clip → existing validators (`MAX_VIDEO_BYTES`, `MIN_TRIM`).
- Non-image/non-video file → existing `isLikelyImage` / `isLikelyVideo` guards.
- Upload rollback on row-insert failure → remove the uploaded poster (mirror existing video rollback).
- Poster signing failure → name still renders (already handled by `customToCatalogEntry`).
- `MediaRecorder` blob with `duration: Infinity` → handled in `VideoCropper` (above).

## Verification

- `npm run typecheck`, `npm run lint`, production build green.
- DB: push migration, regen types.
- Manual (test account `claude-test@example.com`): (a) photo-only create → appears in library with the photo as thumbnail → add to a program → hub/workout show the photo (not the logo); (b) record ~10s → auto-stop works past 80s → reframe+trim → save → plays; (c) existing video upload still works unchanged; (d) re-open an existing video custom (regression on the `useReframe` extraction).

## Out of scope / deferred

- Post-save editing of a custom exercise (none exists today).
- Keeping the original photo for non-destructive re-crop after save.
- Client-side video transcode/downscale for large uploads.
- GC of never-referenced uploads (already deferred for videos).
