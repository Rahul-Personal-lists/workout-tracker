-- Atomic day-order writes + commit-time drift guard.
--
-- Why: three program_days order-drift incidents (June 2026, 2026-07-13,
-- 2026-07-21). The client-side applyDayOrder ran 2N sequential
-- un-transactioned UPDATEs (park + finals), so an interrupted run — or a
-- reorder fired from a stale build — could leave the order scrambled with
-- nothing noticing. Two changes:
--
--   1. apply_day_order(): applies a full planDayOrder target set in ONE
--      transaction (optionally inserting a new day in the same transaction
--      for addDay). Planning stays client-side — planDayOrder is the pure,
--      verbatim-shared planner in both apps; the DB only applies targets.
--   2. program_days_live_contiguous: a deferred constraint trigger asserting
--      live day_numbers are exactly 1..N at every commit. Any client still on
--      the old multi-statement path now fails loudly on its FIRST statement
--      instead of corrupting the order.
--
-- Shared-invariants policy note: the "no new RPCs" stance had an explicit
-- revisit trigger — "a drift incident" — which has now fired three times.

create or replace function public.apply_day_order(
  p_program_id uuid,
  p_targets jsonb,
  p_insert jsonb default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_total integer;
  v_targets integer;
  v_matched integer;
begin
  -- Optional atomic insert (addDay): park far above both the live range and
  -- the 1e6 two-phase band; the targets below renumber it into place.
  if p_insert is not null then
    insert into program_days (id, program_id, day_number, label, title)
    values (
      (p_insert->>'id')::uuid,
      p_program_id,
      2000000 + coalesce(
        (select max(day_number) from program_days where program_id = p_program_id),
        0
      ),
      p_insert->>'label',
      p_insert->>'title'
    );
  end if;

  -- The target set must cover exactly this program's rows — no misses, no
  -- strays. Runs as SECURITY INVOKER: RLS scopes both counts, so for a program
  -- the caller doesn't own everything is 0 and only an empty no-op passes.
  select count(*) into v_total
  from program_days
  where program_id = p_program_id;

  select count(*) into v_targets
  from jsonb_array_elements(p_targets);

  select count(*) into v_matched
  from jsonb_to_recordset(p_targets) as t(id uuid)
  join program_days d on d.id = t.id and d.program_id = p_program_id;

  if v_matched <> v_total or v_matched <> v_targets then
    raise exception
      'apply_day_order: % targets, % matched, but program has % day rows',
      v_targets, v_matched, v_total;
  end if;

  -- Two-phase renumber inside one transaction: park above the live range so
  -- the unique (program_id, day_number) index can't collide, then finals.
  update program_days d
  set day_number = t.day_number + 1000000
  from jsonb_to_recordset(p_targets) as t(id uuid, day_number integer)
  where d.id = t.id and d.program_id = p_program_id;

  update program_days d
  set day_number = t.day_number, label = t.label
  from jsonb_to_recordset(p_targets) as t(id uuid, day_number integer, label text)
  where d.id = t.id and d.program_id = p_program_id;
end;
$$;

comment on function public.apply_day_order(uuid, jsonb, jsonb) is
  'Atomically applies a planDayOrder target set [{id, day_number, label}] to a program''s days. Optional p_insert {id, label, title} adds a day in the same transaction. Planning is client-side; this only applies.';

revoke execute on function public.apply_day_order(uuid, jsonb, jsonb) from anon;

-- Commit-time drift guard: a program's live day_numbers must be exactly 1..N
-- (archived days park above the live range and are exempt; an empty set
-- passes, so full-program deletes are unaffected). SECURITY DEFINER so the
-- check always sees the program's full row set regardless of the writer.
create or replace function public.assert_live_days_contiguous()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_program uuid := coalesce(new.program_id, old.program_id);
  v_bad integer;
begin
  select count(*) into v_bad
  from (
    select day_number,
           row_number() over (order by day_number) as expected
    from program_days
    where program_id = v_program
      and archived_at is null
  ) x
  where x.day_number <> x.expected;

  if v_bad > 0 then
    raise exception
      'program_days drift guard: live day_numbers for program % must be contiguous 1..N — write through apply_day_order()',
      v_program;
  end if;
  return null;
end;
$$;

drop trigger if exists program_days_live_contiguous on public.program_days;
create constraint trigger program_days_live_contiguous
after insert or update or delete on public.program_days
deferrable initially deferred
for each row
execute function public.assert_live_days_contiguous();
