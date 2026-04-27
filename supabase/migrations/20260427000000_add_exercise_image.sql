-- Reference image per exercise (frame 0 from a 2-frame loop).
-- Frame 1 is derived in UI by swapping /0.jpg → /1.jpg.
alter table public.program_exercises
  add column if not exists image_url text;
