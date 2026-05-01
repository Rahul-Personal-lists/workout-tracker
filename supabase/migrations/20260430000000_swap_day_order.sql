create or replace function public.swap_day_order(p_day_a uuid, p_day_b uuid)
returns void language plpgsql security invoker as $$
declare
  v_prog   uuid;
  v_num_a  int;
  v_num_b  int;
  v_temp   int;
begin
  select program_id, day_number into v_prog, v_num_a
    from public.program_days where id = p_day_a;
  select day_number into v_num_b
    from public.program_days where id = p_day_b and program_id = v_prog;

  if v_num_a is null or v_num_b is null then
    raise exception 'days not found or not in the same program';
  end if;

  select max(day_number) + 1000 into v_temp
    from public.program_days where program_id = v_prog;

  update public.program_days set day_number = v_temp  where id = p_day_a;
  update public.program_days set day_number = v_num_a where id = p_day_b;
  update public.program_days set day_number = v_num_b where id = p_day_a;
end;
$$;
