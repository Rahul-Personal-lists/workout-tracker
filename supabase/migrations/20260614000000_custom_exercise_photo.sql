-- Photo-only custom exercises: a custom exercise may now be just a thumbnail
-- (no video). poster_path stays NOT NULL (every entry has a thumbnail); the
-- square crop is baked into poster.jpg, so crop_rect/trim/aspect stay null for
-- photo rows. video_path becomes nullable for the video-less case.
alter table public.custom_exercises alter column video_path drop not null;
