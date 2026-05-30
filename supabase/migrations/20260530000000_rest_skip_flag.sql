-- Distinguish rest-day skips from real workouts explicitly, instead of
-- overloading duration_seconds = 0. A genuine workout finished within one
-- clock second (or where paused time >= elapsed) also yields duration 0, so
-- getUndoableSkip/undoLastSkip could surface — and DELETE — a real session.
--
-- Idempotent (add-if-not-exists + backfill matched on the exact skip shape) so
-- it is safe to re-run on a fresh environment.

alter table public.workout_sessions
  add column if not exists is_rest_skip boolean not null default false;

-- Backfill historical skips. skipRestDay inserts a session with
-- started_at = ended_at and no set_logs; match exactly that shape so real
-- zero-duration workouts (which have logged sets) are left untouched.
update public.workout_sessions ws
   set is_rest_skip = true
 where ws.ended_at is not null
   and ws.started_at = ws.ended_at
   and not exists (
     select 1 from public.set_logs sl where sl.session_id = ws.id
   );
