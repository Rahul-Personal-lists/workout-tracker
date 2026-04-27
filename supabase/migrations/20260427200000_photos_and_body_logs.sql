-- Workout-finish photos + bodyweight/calorie logs.

-- ──────────────────────────────────────────────
-- workout_session_photos
-- ──────────────────────────────────────────────
create table public.workout_session_photos (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.workout_sessions(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  created_at   timestamptz not null default now()
);

create index workout_session_photos_session_idx
  on public.workout_session_photos (session_id, created_at);

alter table public.workout_session_photos enable row level security;

create policy "workout_session_photos: owner all"
  on public.workout_session_photos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ──────────────────────────────────────────────
-- body_logs (one per user per day, weight required, calories optional)
-- ──────────────────────────────────────────────
create table public.body_logs (
  user_id    uuid not null references auth.users(id) on delete cascade,
  log_date   date not null,
  weight_lb  numeric not null check (weight_lb > 0 and weight_lb < 2000),
  calories   int check (calories >= 0 and calories < 100000),
  note       text,
  updated_at timestamptz not null default now(),
  primary key (user_id, log_date)
);

create index body_logs_user_date_idx
  on public.body_logs (user_id, log_date desc);

alter table public.body_logs enable row level security;

create policy "body_logs: owner all"
  on public.body_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ──────────────────────────────────────────────
-- Storage bucket: workout-photos (private; objects keyed by user_id prefix)
-- Path layout: {user_id}/{session_id}/{uuid}.{ext}
-- ──────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('workout-photos', 'workout-photos', false)
on conflict (id) do nothing;

create policy "workout-photos: owner read"
  on storage.objects for select
  using (
    bucket_id = 'workout-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "workout-photos: owner insert"
  on storage.objects for insert
  with check (
    bucket_id = 'workout-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "workout-photos: owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'workout-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
