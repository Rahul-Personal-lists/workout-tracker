-- Workout tracker initial schema
-- All tables RLS-enabled. Single-user today, multi-user-ready.

create extension if not exists "pgcrypto";

-- ──────────────────────────────────────────────
-- programs
-- ──────────────────────────────────────────────
create table public.programs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  weeks         int  not null check (weeks between 1 and 52),
  deload_weeks  int[] not null default '{}',
  created_at    timestamptz not null default now()
);

create index programs_user_idx on public.programs (user_id);

alter table public.programs enable row level security;

create policy "programs: owner read"
  on public.programs for select
  using (auth.uid() = user_id);

create policy "programs: owner write"
  on public.programs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ──────────────────────────────────────────────
-- program_days
-- ──────────────────────────────────────────────
create table public.program_days (
  id          uuid primary key default gen_random_uuid(),
  program_id  uuid not null references public.programs(id) on delete cascade,
  day_number  int  not null check (day_number > 0),
  label       text not null,
  title       text not null,
  unique (program_id, day_number)
);

create index program_days_program_idx on public.program_days (program_id);

alter table public.program_days enable row level security;

create policy "program_days: owner via program"
  on public.program_days for all
  using (
    exists (
      select 1 from public.programs p
      where p.id = program_days.program_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.programs p
      where p.id = program_days.program_id and p.user_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────────
-- program_exercises
-- ──────────────────────────────────────────────
create table public.program_exercises (
  id              uuid primary key default gen_random_uuid(),
  program_day_id  uuid not null references public.program_days(id) on delete cascade,
  order_index     int  not null,
  name            text not null,
  sets            int  not null check (sets > 0),
  base_reps       int,
  start_weight    numeric,
  increment       numeric not null default 0,
  tracked         boolean not null default false,
  note            text
);

create index program_exercises_day_idx on public.program_exercises (program_day_id, order_index);

alter table public.program_exercises enable row level security;

create policy "program_exercises: owner via day"
  on public.program_exercises for all
  using (
    exists (
      select 1
      from public.program_days d
      join public.programs p on p.id = d.program_id
      where d.id = program_exercises.program_day_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.program_days d
      join public.programs p on p.id = d.program_id
      where d.id = program_exercises.program_day_id and p.user_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────────
-- workout_sessions
-- ──────────────────────────────────────────────
create table public.workout_sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  program_day_id    uuid not null references public.program_days(id),
  week_number       int  not null check (week_number between 1 and 52),
  started_at        timestamptz not null default now(),
  ended_at          timestamptz,
  duration_seconds  int generated always as (
    case when ended_at is null then null
         else extract(epoch from (ended_at - started_at))::int end
  ) stored,
  notes             text
);

create index workout_sessions_user_started_idx
  on public.workout_sessions (user_id, started_at desc);

alter table public.workout_sessions enable row level security;

create policy "workout_sessions: owner read"
  on public.workout_sessions for select
  using (auth.uid() = user_id);

create policy "workout_sessions: owner write"
  on public.workout_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ──────────────────────────────────────────────
-- set_logs
-- ──────────────────────────────────────────────
create table public.set_logs (
  id                    uuid primary key default gen_random_uuid(),
  session_id            uuid not null references public.workout_sessions(id) on delete cascade,
  program_exercise_id   uuid not null references public.program_exercises(id),
  set_number            int  not null check (set_number > 0),
  planned_weight        numeric,
  planned_reps          int,
  actual_weight         numeric,
  actual_reps           int,
  completed             boolean not null default false,
  logged_at             timestamptz not null default now(),
  unique (session_id, program_exercise_id, set_number)
);

create index set_logs_exercise_logged_idx
  on public.set_logs (program_exercise_id, logged_at desc);

alter table public.set_logs enable row level security;

create policy "set_logs: owner via session"
  on public.set_logs for all
  using (
    exists (
      select 1 from public.workout_sessions s
      where s.id = set_logs.session_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workout_sessions s
      where s.id = set_logs.session_id and s.user_id = auth.uid()
    )
  );
