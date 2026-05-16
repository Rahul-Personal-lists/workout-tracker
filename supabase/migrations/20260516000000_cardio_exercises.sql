-- Time-tracked (cardio) exercises.
-- program_exercises gains kind ('reps' | 'time') + target_seconds.
-- set_logs gains planned_seconds + actual_seconds (snapshotted at log time).

alter table public.program_exercises
  add column kind text not null default 'reps'
    check (kind in ('reps', 'time')),
  add column target_seconds int
    check (target_seconds is null or target_seconds > 0);

alter table public.set_logs
  add column planned_seconds int,
  add column actual_seconds int;

-- Backfill: flip known time-based catalog entries to kind='time' with a 60s
-- default. List derived from public/data/exercises-catalog.json
-- (category='cardio') plus 'Plank' which sits under strength but is timed.
update public.program_exercises
  set kind = 'time', target_seconds = 60
  where lower(name) in (
    'bicycling',
    'bicycling, stationary',
    'elliptical trainer',
    'jogging, treadmill',
    'prowler sprint',
    'recumbent bike',
    'rope jumping',
    'rowing, stationary',
    'running, treadmill',
    'skating',
    'stairmaster',
    'step mill',
    'trail running/walking',
    'walking, treadmill',
    'plank'
  );

-- Stale planned reps/weight on uncompleted sets belonging to backfilled
-- exercises would render alongside the new duration row. Null them out.
update public.set_logs sl
  set planned_weight = null, planned_reps = null
  where sl.completed = false
    and exists (
      select 1 from public.program_exercises pe
      where pe.id = sl.program_exercise_id and pe.kind = 'time'
    );
