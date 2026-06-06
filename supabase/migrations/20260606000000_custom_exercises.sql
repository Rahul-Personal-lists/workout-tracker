-- Per-user custom exercises built from an uploaded mp4 clip. Each row is a
-- reusable library entry surfaced in the exercise catalog alongside the built-in
-- free-exercise-db catalog. Non-destructive crop: the original mp4 is kept; the
-- reframe rect + trim bounds are metadata applied at playback (no re-encode).
-- RLS owner-scoped like every other table.
create table public.custom_exercises (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  name               text not null check (char_length(name) between 1 and 120),
  -- storage paths in the shared workout-photos bucket, under
  -- {user_id}/exercise-videos/{id}/...
  video_path         text not null,
  poster_path        text not null,
  -- {x,y,w,h} normalized 0..1 reframe window; null = use the full frame.
  crop_rect          jsonb,
  trim_start_seconds numeric check (trim_start_seconds is null or trim_start_seconds >= 0),
  trim_end_seconds   numeric check (trim_end_seconds   is null or trim_end_seconds   >  0),
  -- target W/H of the playback frame (e.g. 0.5625 = 9:16). null = native.
  aspect_ratio       numeric check (aspect_ratio is null or aspect_ratio > 0),
  -- free-exercise-db catalog muscle strings (e.g. {chest,triceps}); feeds
  -- regionsFromCatalogMuscles (badge) + the catalog MUSCLE_GROUPS filter.
  muscles            text[] not null default '{}',
  -- default add-time config carried into ConfigForm when adding to a day.
  default_kind       text not null default 'reps' check (default_kind in ('reps', 'time')),
  default_sets       int  not null default 3 check (default_sets between 1 and 20),
  default_reps       int  check (default_reps is null or default_reps between 0 and 200),
  default_seconds    int  check (default_seconds is null or default_seconds between 1 and 36000),
  archived_at        timestamptz,
  created_at         timestamptz not null default now()
);

create index custom_exercises_user_idx
  on public.custom_exercises (user_id, created_at desc);

alter table public.custom_exercises enable row level security;

create policy "custom_exercises: owner all"
  on public.custom_exercises for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Snapshot the video + crop/trim + muscles onto program_exercises at add time
-- (consistent with image_url / planned_* snapshotting -> history stays accurate
-- even if the library entry is later edited or soft-deleted). custom_exercise_id
-- is a nullable provenance pointer only; media resolution does not depend on it.
-- All columns are nullable / defaulted, so existing rows are unaffected.
alter table public.program_exercises
  add column if not exists video_path         text,
  add column if not exists poster_path        text,
  add column if not exists crop_rect          jsonb,
  add column if not exists trim_start_seconds numeric,
  add column if not exists trim_end_seconds   numeric,
  add column if not exists aspect_ratio       numeric,
  add column if not exists muscles            text[] not null default '{}',
  add column if not exists custom_exercise_id uuid references public.custom_exercises(id) on delete set null;
