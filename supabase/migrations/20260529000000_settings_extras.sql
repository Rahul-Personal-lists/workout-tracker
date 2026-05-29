-- Profile fields, units pref, and sound/vibration lead-time prefs for the
-- restructured settings screen.

alter table public.profiles
  add column if not exists gender text
    check (gender in ('male', 'female', 'other')),
  add column if not exists age smallint
    check (age > 0 and age < 150),
  add column if not exists height_cm numeric
    check (height_cm > 0 and height_cm < 300),
  add column if not exists avatar_path text,
  add column if not exists units text not null default 'imperial'
    check (units in ('imperial', 'metric')),
  add column if not exists sound_lead_seconds smallint
    check (sound_lead_seconds in (0, 5)),
  add column if not exists vibration_lead_seconds smallint
    check (vibration_lead_seconds in (0, 5));

-- Avatars live in the existing workout-photos bucket under
-- {user_id}/profile/{uuid}.{ext}. The bucket's RLS policies key off the
-- first folder segment (auth.uid()::text), so no new policies are needed.
