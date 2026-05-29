-- Circumference measurements (chest, waist, hips, bicep, thigh).
-- Decoupled from body_logs (which requires weight_lb) so a measurement-only
-- day needs no weigh-in. Canonical unit is cm (weight's canonical is lb).

create table public.body_measurements (
  user_id    uuid not null references auth.users(id) on delete cascade,
  log_date   date not null,
  metric     text not null check (metric in ('chest','waist','hips','bicep','thigh')),
  value_cm   numeric not null check (value_cm > 0 and value_cm < 500),
  updated_at timestamptz not null default now(),
  primary key (user_id, log_date, metric)
);

create index body_measurements_user_metric_date_idx
  on public.body_measurements (user_id, metric, log_date desc);

alter table public.body_measurements enable row level security;

create policy "body_measurements: owner all"
  on public.body_measurements for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
