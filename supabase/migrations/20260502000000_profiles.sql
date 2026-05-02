-- profiles: per-user display name. Created on demand via upsert from
-- the settings page; nullable until the user fills it in.

create table public.profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: owner read"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "profiles: owner write"
  on public.profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
