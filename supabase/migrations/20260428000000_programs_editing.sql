-- Programs: support up to two programs per user with one active at a time,
-- and soft-delete on program_days (mirrors program_exercises.archived_at).

alter table public.programs
  add column is_active   boolean not null default true,
  add column archived_at timestamptz;

alter table public.program_days
  add column archived_at timestamptz;

-- At most one active, non-archived program per user.
create unique index programs_one_active_per_user
  on public.programs (user_id)
  where is_active and archived_at is null;
