-- Per-exercise pacing: how many non-deload weeks elapse between increment bumps.
-- Default 1 keeps existing weekly progression. 2 means add `increment` every other
-- non-deload week (used for cable accessories where +10/wk is unrealistic).

alter table public.program_exercises
  add column progression_weeks int not null default 1
  check (progression_weeks between 1 and 8);
