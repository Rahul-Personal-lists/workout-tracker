-- Soft-delete column for program exercises.
-- Hard delete would break FK on set_logs; archiving preserves history.
alter table public.program_exercises
  add column if not exists archived_at timestamptz;
