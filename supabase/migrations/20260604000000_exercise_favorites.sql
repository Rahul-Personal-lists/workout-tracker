-- Catalog-level favorite exercises. Keyed by the free-exercise-db catalog slug
-- (CatalogEntry.id) rather than a program_exercises FK — favorites are about
-- browsing the library, not a specific program instance. RLS owner-scoped like
-- every other table. Custom (no-catalog) exercises have no stable slug, so they
-- can't be favorited in v1.

create table public.exercise_favorites (
  user_id       uuid not null references auth.users(id) on delete cascade,
  exercise_slug text not null,
  created_at    timestamptz not null default now(),
  primary key (user_id, exercise_slug)
);

create index exercise_favorites_user_idx
  on public.exercise_favorites (user_id);

alter table public.exercise_favorites enable row level security;

create policy "exercise_favorites: owner all"
  on public.exercise_favorites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
