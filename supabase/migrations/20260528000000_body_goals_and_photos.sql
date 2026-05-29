-- Body page: goal weight, body fat %, and progress photos.

-- Goal weight per user (single value, lives on profile).
alter table public.profiles
  add column if not exists goal_weight_lb numeric
    check (goal_weight_lb > 0 and goal_weight_lb < 2000);

-- Body fat % on each daily log.
alter table public.body_logs
  add column if not exists body_fat_pct numeric
    check (body_fat_pct > 0 and body_fat_pct < 100);

-- Progress photos attached to a daily body log.
-- FK on (user_id, log_date) means a body_logs row must exist for the date.
create table if not exists public.body_log_photos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  log_date     date not null,
  storage_path text not null,
  created_at   timestamptz not null default now(),
  foreign key (user_id, log_date)
    references public.body_logs (user_id, log_date) on delete cascade
);

create index if not exists body_log_photos_user_date_idx
  on public.body_log_photos (user_id, log_date desc);

alter table public.body_log_photos enable row level security;

create policy "body_log_photos: owner all"
  on public.body_log_photos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Photos live in the existing workout-photos bucket under
-- {user_id}/body/{log_date}/{uuid}.{ext}. The bucket's RLS policies
-- already check (storage.foldername(name))[1] = auth.uid()::text,
-- so no additional storage policies are needed.
