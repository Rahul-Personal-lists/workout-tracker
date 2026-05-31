-- Body fat / calories no longer require a weight on the same date.
-- weight/body-fat/calories share one body_logs row (PK user_id, log_date), so
-- weight_lb was NOT NULL purely to anchor the row. Make it optional and instead
-- require the row carry at least one metric, so no empty rows appear.
--
-- The inline CHECK (weight_lb > 0 and weight_lb < 2000) is left untouched: a NULL
-- weight makes it evaluate to UNKNOWN, which a CHECK accepts (rejects only FALSE),
-- so it still rejects a present-but-invalid weight while allowing NULL.

alter table public.body_logs
  alter column weight_lb drop not null;

-- num_nonnulls(...) > 0 (not "a is not null or b is not null or ...") because the
-- OR form yields UNKNOWN — which a CHECK accepts — when every metric is NULL, so it
-- would fail to block an empty row. num_nonnulls always returns an integer.
alter table public.body_logs
  drop constraint if exists body_logs_at_least_one_metric;

alter table public.body_logs
  add constraint body_logs_at_least_one_metric
  check (num_nonnulls(weight_lb, body_fat_pct, calories) > 0);
