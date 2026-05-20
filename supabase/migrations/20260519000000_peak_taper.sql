-- Peak-taper opt-in flag per exercise.
-- When true, progression.getPlannedReps applies the W7/W9/W10/W11 taper:
--   W7  = base - 2
--   W8  = base (deload, unchanged)
--   W9  = base - 2
--   W10 = base - 4
--   W11 = base - 6
--   W12 = base (deload, unchanged)
-- Default false keeps current behaviour for all existing rows.

ALTER TABLE program_exercises
ADD COLUMN peak_taper boolean NOT NULL DEFAULT false;
