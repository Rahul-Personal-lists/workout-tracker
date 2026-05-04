-- ──────────────────────────────────────────────
-- Pause/resume support for workout_sessions
-- ──────────────────────────────────────────────
alter table public.workout_sessions
  add column paused_at            timestamptz,
  add column total_paused_seconds int not null default 0;

-- Redefine duration_seconds to exclude time spent paused.
alter table public.workout_sessions
  drop column duration_seconds;

alter table public.workout_sessions
  add column duration_seconds int generated always as (
    case when ended_at is null then null
         else greatest(
           extract(epoch from (ended_at - started_at))::int - total_paused_seconds,
           0
         ) end
  ) stored;

-- Atomic resume: bumps total_paused_seconds and clears paused_at in one statement,
-- avoiding a read/compute/write race when the user taps Resume rapidly.
create or replace function public.resume_session(session_id uuid)
returns void
language sql
security invoker
as $$
  update public.workout_sessions
     set total_paused_seconds = total_paused_seconds
                              + greatest(extract(epoch from (now() - paused_at))::int, 0),
         paused_at = null
   where id = session_id
     and user_id = auth.uid()
     and ended_at is null
     and paused_at is not null;
$$;
