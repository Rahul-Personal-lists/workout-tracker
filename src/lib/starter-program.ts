// Reference images come from yuhonas/free-exercise-db (public domain).
// Stored as frame-0 URL; UI swaps to /1.jpg for the second frame.
const IMG = (slug: string) =>
  `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${slug}/0.jpg`;

export type StarterExercise = {
  name: string;
  sets: number;
  base_reps: number | null;
  increment: number;
  start_weight: number | null;
  tracked: boolean;
  image_url: string | null;
  note?: string;
  progression_weeks?: number;
  kind?: "reps" | "time";
  target_seconds?: number | null;
  peak_taper?: boolean;
};

export type StarterDay = {
  day_number: number;
  label: string;
  title: string;
  exercises: StarterExercise[];
};

export type StarterProgram = {
  name: string;
  weeks: number;
  deload_weeks: number[];
  days: StarterDay[];
};

export type PresetProgram = StarterProgram & {
  id: string;
  description: string;
};

// Hardware grid in Rahul's gym: smallest plate is 5 lb, so the smallest
// barbell jump is 10 lb. Cable stacks pin in 10 lb steps. All start_weights
// for barbell + cable lifts must therefore be multiples of 10. Cable
// accessories use progression_weeks: 2 because +10/wk is unrealistic on
// face pulls / cable fly / curls etc. Dumbbells jump in 5 lb steps;
// DB Good Morning and Bulgarian Split Squat use 10 lb (heavier loads).

const PRESET_STARTER_12WK: StarterProgram = {
  name: "12-Week Hypertrophy",
  weeks: 12,
  deload_weeks: [4, 8, 12],
  days: [
    {
      day_number: 1,
      label: "Day 1",
      title: "Upper — Strength",
      exercises: [
        { name: "Barbell Bench Press",      sets: 4, base_reps: 10, increment: 10,  start_weight: 60,   tracked: true,  image_url: IMG("Barbell_Bench_Press_-_Medium_Grip"), peak_taper: true },
        { name: "Barbell Bent-Over Row",    sets: 4, base_reps: 10, increment: 10,  start_weight: 60,   tracked: true,  image_url: IMG("Bent_Over_Barbell_Row"),             peak_taper: true },
        { name: "Seated DB Overhead Press", sets: 3, base_reps: 10, increment: 5,   start_weight: 40,   tracked: true,  image_url: IMG("Seated_Dumbbell_Press"),             peak_taper: true },
        { name: "Cable Row (close grip)",   sets: 3, base_reps: 10, increment: 10,  start_weight: 50,   tracked: false, image_url: IMG("Seated_Cable_Rows"), progression_weeks: 2 },
        { name: "EZ Bar Curl",              sets: 3, base_reps: 10, increment: 10,  start_weight: 30,   tracked: false, image_url: IMG("Close-Grip_EZ_Bar_Curl"), progression_weeks: 2 },
        { name: "Tricep Pushdown",          sets: 3, base_reps: 10, increment: 10,  start_weight: 30,   tracked: false, image_url: IMG("Triceps_Pushdown"), progression_weeks: 2 },
      ],
    },
    {
      day_number: 2,
      label: "Day 2",
      title: "Lower — Strength",
      exercises: [
        { name: "Barbell Back Squat",        sets: 4, base_reps: 10, increment: 10,  start_weight: 60,   tracked: true,  image_url: IMG("Barbell_Squat"),                                                              peak_taper: true },
        { name: "Romanian Deadlift",         sets: 3, base_reps: 10, increment: 10,  start_weight: 70,   tracked: true,  image_url: IMG("Romanian_Deadlift"),                                                          peak_taper: true },
        { name: "DB Reverse Lunge",          sets: 3, base_reps: 10, increment: 5,   start_weight: 15,   tracked: false, image_url: IMG("Dumbbell_Rear_Lunge"),                         note: "per side" },
        { name: "DB Hip Thrust",             sets: 3, base_reps: 10, increment: 5,   start_weight: 35,   tracked: false, image_url: IMG("Barbell_Hip_Thrust"),                                                         peak_taper: true },
        { name: "Standing Calf Raises (DB)", sets: 4, base_reps: 15, increment: 5,   start_weight: 30,   tracked: false, image_url: IMG("Standing_Calf_Raises") },
        { name: "Plank",                     sets: 3, base_reps: null, increment: 0, start_weight: null, tracked: false, image_url: IMG("Plank"),                                       kind: "time", target_seconds: 45 },
      ],
    },
    {
      day_number: 3,
      label: "Day 3",
      title: "Rest",
      exercises: [],
    },
    {
      day_number: 4,
      label: "Day 4",
      title: "Upper — Hypertrophy",
      exercises: [
        { name: "Incline DB Press",          sets: 4, base_reps: 10, increment: 5,   start_weight: 25, tracked: false, image_url: IMG("Incline_Dumbbell_Press") },
        { name: "Lat Pulldown",              sets: 4, base_reps: 10, increment: 10,  start_weight: 50, tracked: false, image_url: IMG("Wide-Grip_Lat_Pulldown"), progression_weeks: 2 },
        { name: "Cable Fly",                 sets: 3, base_reps: 12, increment: 10,  start_weight: 20, tracked: false, image_url: IMG("Flat_Bench_Cable_Flyes"), progression_weeks: 2 },
        { name: "Face Pulls",                sets: 3, base_reps: 12, increment: 10,  start_weight: 20, tracked: false, image_url: IMG("Face_Pull"), progression_weeks: 2, peak_taper: true },
        { name: "Hammer Curl",               sets: 3, base_reps: 12, increment: 5,   start_weight: 20, tracked: false, image_url: IMG("Hammer_Curls") },
        { name: "Overhead Tricep Extension", sets: 3, base_reps: 12, increment: 5,   start_weight: 25, tracked: false, image_url: IMG("Seated_Triceps_Press") },
      ],
    },
    {
      day_number: 5,
      label: "Day 5",
      title: "Lower — Hypertrophy",
      exercises: [
        { name: "DB Good Morning",            sets: 3, base_reps: 12, increment: 10,  start_weight: 20,   tracked: false, image_url: IMG("Good_Morning") },
        { name: "Bulgarian Split Squat",      sets: 3, base_reps: 10, increment: 10,  start_weight: 20,   tracked: false, image_url: IMG("One_Leg_Barbell_Squat"),                       note: "per side, DB" },
        { name: "DB Lunges",                  sets: 3, base_reps: 12, increment: 5,   start_weight: 15,   tracked: false, image_url: IMG("Dumbbell_Lunges"),                            note: "per side" },
        { name: "DB Stiff-Leg Deadlift",      sets: 3, base_reps: 12, increment: 5,   start_weight: 35,   tracked: false, image_url: IMG("Stiff-Legged_Dumbbell_Deadlift") },
        { name: "DB Hip Thrust",              sets: 3, base_reps: 12, increment: 5,   start_weight: 35,   tracked: false, image_url: IMG("Barbell_Hip_Thrust") },
        { name: "Ab Wheel / Plank Variation", sets: 3, base_reps: 12, increment: 0,   start_weight: null, tracked: false, image_url: IMG("Ab_Roller"),                                                                  peak_taper: true },
      ],
    },
  ],
};

const PRESET_PPL_6WK: StarterProgram = {
  name: "Push / Pull / Legs",
  weeks: 6,
  deload_weeks: [],
  days: [
    {
      day_number: 1,
      label: "Day 1",
      title: "Push",
      exercises: [
        { name: "Barbell Bench Press",      sets: 4, base_reps: 10, increment: 10,  start_weight: 60, tracked: true,  image_url: IMG("Barbell_Bench_Press_-_Medium_Grip") },
        { name: "Seated DB Overhead Press", sets: 3, base_reps: 10, increment: 5,   start_weight: 35, tracked: false, image_url: IMG("Seated_Dumbbell_Press") },
        { name: "Incline DB Press",         sets: 3, base_reps: 10, increment: 5,   start_weight: 25, tracked: false, image_url: IMG("Incline_Dumbbell_Press") },
        { name: "Cable Fly",                sets: 3, base_reps: 12, increment: 10,  start_weight: 20, tracked: false, image_url: IMG("Flat_Bench_Cable_Flyes"), progression_weeks: 2 },
        { name: "Tricep Pushdown",          sets: 3, base_reps: 12, increment: 10,  start_weight: 30, tracked: false, image_url: IMG("Triceps_Pushdown"), progression_weeks: 2 },
      ],
    },
    {
      day_number: 2,
      label: "Day 2",
      title: "Pull",
      exercises: [
        { name: "Barbell Bent-Over Row",  sets: 4, base_reps: 10, increment: 10,  start_weight: 60, tracked: true,  image_url: IMG("Bent_Over_Barbell_Row") },
        { name: "Lat Pulldown",           sets: 3, base_reps: 10, increment: 10,  start_weight: 50, tracked: false, image_url: IMG("Wide-Grip_Lat_Pulldown"), progression_weeks: 2 },
        { name: "Cable Row (close grip)", sets: 3, base_reps: 10, increment: 10,  start_weight: 50, tracked: false, image_url: IMG("Seated_Cable_Rows"), progression_weeks: 2 },
        { name: "Face Pulls",             sets: 3, base_reps: 12, increment: 10,  start_weight: 20, tracked: false, image_url: IMG("Face_Pull"), progression_weeks: 2 },
        { name: "EZ Bar Curl",            sets: 3, base_reps: 12, increment: 10,  start_weight: 30, tracked: false, image_url: IMG("Close-Grip_EZ_Bar_Curl"), progression_weeks: 2 },
      ],
    },
    {
      day_number: 3,
      label: "Day 3",
      title: "Rest",
      exercises: [],
    },
    {
      day_number: 4,
      label: "Day 4",
      title: "Legs",
      exercises: [
        { name: "Barbell Back Squat",        sets: 4, base_reps: 10, increment: 10,  start_weight: 60, tracked: true,  image_url: IMG("Barbell_Squat") },
        { name: "Romanian Deadlift",         sets: 3, base_reps: 10, increment: 10,  start_weight: 70, tracked: true,  image_url: IMG("Romanian_Deadlift") },
        { name: "DB Lunges",                 sets: 3, base_reps: 12, increment: 5,   start_weight: 20, tracked: false, image_url: IMG("Dumbbell_Lunges"),         note: "per side" },
        { name: "DB Hip Thrust",             sets: 3, base_reps: 12, increment: 5,   start_weight: 35, tracked: false, image_url: IMG("Barbell_Hip_Thrust") },
        { name: "Standing Calf Raises (DB)", sets: 4, base_reps: 12, increment: 5,   start_weight: 30, tracked: false, image_url: IMG("Standing_Calf_Raises") },
      ],
    },
  ],
};

const PRESET_UPPER_LOWER_8WK: StarterProgram = {
  name: "Upper / Lower",
  weeks: 8,
  deload_weeks: [8],
  days: [
    {
      day_number: 1,
      label: "Day 1",
      title: "Upper A",
      exercises: [
        { name: "Barbell Bench Press",      sets: 4, base_reps: 10, increment: 10,  start_weight: 60, tracked: true,  image_url: IMG("Barbell_Bench_Press_-_Medium_Grip") },
        { name: "Barbell Bent-Over Row",    sets: 4, base_reps: 10, increment: 10,  start_weight: 60, tracked: true,  image_url: IMG("Bent_Over_Barbell_Row") },
        { name: "Seated DB Overhead Press", sets: 3, base_reps: 10, increment: 5,   start_weight: 35, tracked: false, image_url: IMG("Seated_Dumbbell_Press") },
        { name: "EZ Bar Curl",              sets: 3, base_reps: 10, increment: 10,  start_weight: 30, tracked: false, image_url: IMG("Close-Grip_EZ_Bar_Curl"), progression_weeks: 2 },
        { name: "Tricep Pushdown",          sets: 3, base_reps: 10, increment: 10,  start_weight: 30, tracked: false, image_url: IMG("Triceps_Pushdown"), progression_weeks: 2 },
      ],
    },
    {
      day_number: 2,
      label: "Day 2",
      title: "Lower A",
      exercises: [
        { name: "Barbell Back Squat",        sets: 4, base_reps: 10, increment: 10,  start_weight: 60, tracked: true,  image_url: IMG("Barbell_Squat") },
        { name: "Romanian Deadlift",         sets: 3, base_reps: 10, increment: 10,  start_weight: 70, tracked: true,  image_url: IMG("Romanian_Deadlift") },
        { name: "DB Reverse Lunge",          sets: 3, base_reps: 10, increment: 5,   start_weight: 20, tracked: false, image_url: IMG("Dumbbell_Rear_Lunge"),    note: "per side" },
        { name: "Standing Calf Raises (DB)", sets: 4, base_reps: 12, increment: 5,   start_weight: 30, tracked: false, image_url: IMG("Standing_Calf_Raises") },
      ],
    },
    {
      day_number: 3,
      label: "Day 3",
      title: "Rest",
      exercises: [],
    },
    {
      day_number: 4,
      label: "Day 4",
      title: "Upper B",
      exercises: [
        { name: "Incline DB Press",          sets: 4, base_reps: 10, increment: 5,   start_weight: 25, tracked: false, image_url: IMG("Incline_Dumbbell_Press") },
        { name: "Lat Pulldown",              sets: 4, base_reps: 10, increment: 10,  start_weight: 50, tracked: false, image_url: IMG("Wide-Grip_Lat_Pulldown"), progression_weeks: 2 },
        { name: "Cable Fly",                 sets: 3, base_reps: 12, increment: 10,  start_weight: 20, tracked: false, image_url: IMG("Flat_Bench_Cable_Flyes"), progression_weeks: 2 },
        { name: "Face Pulls",                sets: 3, base_reps: 12, increment: 10,  start_weight: 20, tracked: false, image_url: IMG("Face_Pull"), progression_weeks: 2 },
        { name: "Hammer Curl",               sets: 3, base_reps: 12, increment: 5,   start_weight: 20, tracked: false, image_url: IMG("Hammer_Curls") },
        { name: "Overhead Tricep Extension", sets: 3, base_reps: 12, increment: 5,   start_weight: 25, tracked: false, image_url: IMG("Seated_Triceps_Press") },
      ],
    },
    {
      day_number: 5,
      label: "Day 5",
      title: "Lower B",
      exercises: [
        { name: "Bulgarian Split Squat",  sets: 3, base_reps: 10, increment: 10,  start_weight: 20, tracked: false, image_url: IMG("One_Leg_Barbell_Squat"), note: "per side, DB" },
        { name: "DB Stiff-Leg Deadlift",  sets: 3, base_reps: 12, increment: 5,   start_weight: 35, tracked: false, image_url: IMG("Stiff-Legged_Dumbbell_Deadlift") },
        { name: "DB Hip Thrust",          sets: 3, base_reps: 12, increment: 5,   start_weight: 35, tracked: false, image_url: IMG("Barbell_Hip_Thrust") },
        { name: "Plank",                  sets: 3, base_reps: null, increment: 0, start_weight: null, tracked: false, image_url: IMG("Plank"),                kind: "time", target_seconds: 45 },
      ],
    },
  ],
};

const PRESET_FULL_BODY_3X_6WK: StarterProgram = {
  name: "Full Body 3x",
  weeks: 6,
  deload_weeks: [],
  days: [
    {
      day_number: 1,
      label: "Day 1",
      title: "Full Body A",
      exercises: [
        { name: "Barbell Back Squat",       sets: 3, base_reps: 10, increment: 10,  start_weight: 60, tracked: true,  image_url: IMG("Barbell_Squat") },
        { name: "Barbell Bench Press",      sets: 3, base_reps: 10, increment: 10,  start_weight: 60, tracked: true,  image_url: IMG("Barbell_Bench_Press_-_Medium_Grip") },
        { name: "Barbell Bent-Over Row",    sets: 3, base_reps: 10, increment: 10,  start_weight: 60, tracked: true,  image_url: IMG("Bent_Over_Barbell_Row") },
      ],
    },
    {
      day_number: 2,
      label: "Day 2",
      title: "Full Body B",
      exercises: [
        { name: "Barbell Back Squat",        sets: 3, base_reps: 10, increment: 10,  start_weight: 60, tracked: true,  image_url: IMG("Barbell_Squat") },
        { name: "Seated DB Overhead Press",  sets: 3, base_reps: 10, increment: 5,   start_weight: 35, tracked: true,  image_url: IMG("Seated_Dumbbell_Press") },
        { name: "Romanian Deadlift",         sets: 3, base_reps: 10, increment: 10,  start_weight: 70, tracked: true,  image_url: IMG("Romanian_Deadlift") },
      ],
    },
    {
      day_number: 3,
      label: "Day 3",
      title: "Rest",
      exercises: [],
    },
    {
      day_number: 4,
      label: "Day 4",
      title: "Full Body C",
      exercises: [
        { name: "Barbell Back Squat",        sets: 3, base_reps: 10, increment: 10,  start_weight: 60, tracked: true,  image_url: IMG("Barbell_Squat") },
        { name: "Barbell Bench Press",       sets: 3, base_reps: 10, increment: 10,  start_weight: 60, tracked: true,  image_url: IMG("Barbell_Bench_Press_-_Medium_Grip") },
        { name: "Lat Pulldown",              sets: 3, base_reps: 10, increment: 10,  start_weight: 50, tracked: false, image_url: IMG("Wide-Grip_Lat_Pulldown"), progression_weeks: 2 },
      ],
    },
  ],
};

// ── Library catalog (Stage 5) ──────────────────────────────────────────────
// Drafted from standard templates to fill every Library facet (Get Lean,
// Push/Pull, Small & Home, 2/5/6-day). Same conventions as the 4 above: barbell
// & cable start_weights are multiples of 10, cable accessories use
// progression_weeks: 2, dumbbells jump 5 lb (10 lb on the heavy DB hinges/
// splits), peak_taper rides the heavy compounds, holds/conditioning use
// kind: "time". Bodyweight lifts carry start_weight: null (progress by reps).
const REST = (day_number: number): StarterDay => ({
  day_number,
  label: `Day ${day_number}`,
  title: "Rest",
  exercises: [],
});

const PRESET_FULL_BODY_2X: StarterProgram = {
  name: "2-Day Full Body",
  weeks: 8,
  deload_weeks: [4, 8],
  days: [
    {
      day_number: 1,
      label: "Day 1",
      title: "Full Body A",
      exercises: [
        { name: "Barbell Back Squat",        sets: 3, base_reps: 10, increment: 10, start_weight: 60,   tracked: true,  image_url: IMG("Barbell_Squat"),                     peak_taper: true },
        { name: "Barbell Bench Press",        sets: 3, base_reps: 10, increment: 10, start_weight: 50,   tracked: true,  image_url: IMG("Barbell_Bench_Press_-_Medium_Grip"), peak_taper: true },
        { name: "Barbell Bent-Over Row",      sets: 3, base_reps: 10, increment: 10, start_weight: 50,   tracked: true,  image_url: IMG("Bent_Over_Barbell_Row"),             peak_taper: true },
        { name: "Seated DB Overhead Press",   sets: 3, base_reps: 10, increment: 5,  start_weight: 30,   tracked: false, image_url: IMG("Seated_Dumbbell_Press") },
        { name: "DB Bicep Curl",              sets: 2, base_reps: 12, increment: 5,  start_weight: 15,   tracked: false, image_url: IMG("Dumbbell_Bicep_Curl") },
        { name: "Plank",                      sets: 3, base_reps: null, increment: 0, start_weight: null, tracked: false, image_url: IMG("Plank"), kind: "time", target_seconds: 45 },
      ],
    },
    REST(2),
    {
      day_number: 3,
      label: "Day 3",
      title: "Full Body B",
      exercises: [
        { name: "Romanian Deadlift",          sets: 3, base_reps: 10, increment: 10, start_weight: 60,   tracked: true,  image_url: IMG("Romanian_Deadlift"), peak_taper: true },
        { name: "Incline DB Press",           sets: 3, base_reps: 10, increment: 5,  start_weight: 25,   tracked: false, image_url: IMG("Incline_Dumbbell_Press") },
        { name: "Lat Pulldown",               sets: 3, base_reps: 10, increment: 10, start_weight: 50,   tracked: false, image_url: IMG("Wide-Grip_Lat_Pulldown"), progression_weeks: 2 },
        { name: "DB Lunges",                  sets: 3, base_reps: 10, increment: 5,  start_weight: 15,   tracked: false, image_url: IMG("Dumbbell_Lunges"), note: "per side" },
        { name: "Standing Calf Raises (DB)",  sets: 3, base_reps: 15, increment: 5,  start_weight: 30,   tracked: false, image_url: IMG("Standing_Calf_Raises") },
        { name: "Tricep Pushdown",            sets: 3, base_reps: 12, increment: 10, start_weight: 30,   tracked: false, image_url: IMG("Triceps_Pushdown"), progression_weeks: 2 },
      ],
    },
  ],
};

const PRESET_HOME_DB_FULL_BODY: StarterProgram = {
  name: "Home Dumbbell Full Body",
  weeks: 8,
  deload_weeks: [4, 8],
  days: [
    {
      day_number: 1,
      label: "Day 1",
      title: "Full Body A",
      exercises: [
        { name: "Goblet Squat",             sets: 3, base_reps: 12, increment: 5, start_weight: 30, tracked: true,  image_url: IMG("Goblet_Squat"),       peak_taper: true },
        { name: "Dumbbell Bench Press",      sets: 3, base_reps: 10, increment: 5, start_weight: 30, tracked: true,  image_url: IMG("Dumbbell_Bench_Press"), peak_taper: true },
        { name: "One-Arm Dumbbell Row",      sets: 3, base_reps: 10, increment: 5, start_weight: 30, tracked: true,  image_url: IMG("One-Arm_Dumbbell_Row"), note: "per side", peak_taper: true },
        { name: "Seated DB Overhead Press",  sets: 3, base_reps: 10, increment: 5, start_weight: 25, tracked: false, image_url: IMG("Seated_Dumbbell_Press") },
        { name: "DB Bicep Curl",             sets: 3, base_reps: 12, increment: 5, start_weight: 15, tracked: false, image_url: IMG("Dumbbell_Bicep_Curl") },
      ],
    },
    {
      day_number: 2,
      label: "Day 2",
      title: "Full Body B",
      exercises: [
        { name: "DB Stiff-Leg Deadlift",     sets: 3, base_reps: 10, increment: 5,  start_weight: 35,   tracked: true,  image_url: IMG("Stiff-Legged_Dumbbell_Deadlift"), peak_taper: true },
        { name: "Incline DB Press",          sets: 3, base_reps: 10, increment: 5,  start_weight: 20,   tracked: false, image_url: IMG("Incline_Dumbbell_Press") },
        { name: "DB Reverse Lunge",          sets: 3, base_reps: 10, increment: 5,  start_weight: 15,   tracked: false, image_url: IMG("Dumbbell_Rear_Lunge"), note: "per side" },
        { name: "Reverse Flyes",             sets: 3, base_reps: 12, increment: 5,  start_weight: 10,   tracked: false, image_url: IMG("Reverse_Flyes") },
        { name: "Tricep DB Kickback",        sets: 3, base_reps: 12, increment: 5,  start_weight: 10,   tracked: false, image_url: IMG("Tricep_Dumbbell_Kickback") },
        { name: "Plank",                     sets: 3, base_reps: null, increment: 0, start_weight: null, tracked: false, image_url: IMG("Plank"), kind: "time", target_seconds: 45 },
      ],
    },
    REST(3),
    {
      day_number: 4,
      label: "Day 4",
      title: "Full Body C",
      exercises: [
        { name: "Bulgarian Split Squat",     sets: 3, base_reps: 10, increment: 10, start_weight: 20, tracked: false, image_url: IMG("One_Leg_Barbell_Squat"), note: "per side, DB" },
        { name: "DB Floor Press",            sets: 3, base_reps: 10, increment: 5,  start_weight: 30, tracked: false, image_url: IMG("Dumbbell_Floor_Press") },
        { name: "One-Arm Dumbbell Row",      sets: 3, base_reps: 12, increment: 5,  start_weight: 30, tracked: false, image_url: IMG("One-Arm_Dumbbell_Row"), note: "per side" },
        { name: "DB Hip Thrust",             sets: 3, base_reps: 12, increment: 5,  start_weight: 35, tracked: false, image_url: IMG("Barbell_Hip_Thrust") },
        { name: "Hammer Curl",               sets: 3, base_reps: 12, increment: 5,  start_weight: 15, tracked: false, image_url: IMG("Hammer_Curls") },
        { name: "Standing Calf Raises (DB)", sets: 3, base_reps: 15, increment: 5,  start_weight: 30, tracked: false, image_url: IMG("Standing_Calf_Raises") },
      ],
    },
  ],
};

const PRESET_BODYWEIGHT_FOUNDATIONS: StarterProgram = {
  name: "Bodyweight Foundations",
  weeks: 6,
  deload_weeks: [6],
  days: [
    {
      day_number: 1,
      label: "Day 1",
      title: "Push Focus",
      exercises: [
        { name: "Pushups",                sets: 3, base_reps: 12,   increment: 0, start_weight: null, tracked: false, image_url: IMG("Pushups") },
        { name: "Bodyweight Walking Lunge", sets: 3, base_reps: 12, increment: 0, start_weight: null, tracked: false, image_url: IMG("Bodyweight_Walking_Lunge"), note: "per side" },
        { name: "Inverted Row",           sets: 3, base_reps: 10,   increment: 0, start_weight: null, tracked: false, image_url: IMG("Inverted_Row") },
        { name: "Decline Push-Up",        sets: 3, base_reps: 10,   increment: 0, start_weight: null, tracked: false, image_url: IMG("Decline_Push-Up") },
        { name: "Plank",                  sets: 3, base_reps: null,  increment: 0, start_weight: null, tracked: false, image_url: IMG("Plank"), kind: "time", target_seconds: 45 },
      ],
    },
    {
      day_number: 2,
      label: "Day 2",
      title: "Lower Focus",
      exercises: [
        { name: "Freehand Jump Squat",    sets: 3, base_reps: 15,   increment: 0, start_weight: null, tracked: false, image_url: IMG("Freehand_Jump_Squat") },
        { name: "Single Leg Glute Bridge", sets: 3, base_reps: 12,  increment: 0, start_weight: null, tracked: false, image_url: IMG("Single_Leg_Glute_Bridge"), note: "per side" },
        { name: "Pushups (Close & Wide)", sets: 3, base_reps: 12,   increment: 0, start_weight: null, tracked: false, image_url: IMG("Pushups_Close_and_Wide_Hand_Positions") },
        { name: "Superman",               sets: 3, base_reps: 15,   increment: 0, start_weight: null, tracked: false, image_url: IMG("Superman") },
        { name: "Mountain Climbers",      sets: 3, base_reps: null,  increment: 0, start_weight: null, tracked: false, image_url: IMG("Mountain_Climbers"), kind: "time", target_seconds: 40 },
      ],
    },
    REST(3),
    {
      day_number: 4,
      label: "Day 4",
      title: "Pull Focus",
      exercises: [
        { name: "Pullups",            sets: 3, base_reps: 8,    increment: 0, start_weight: null, tracked: false, image_url: IMG("Pullups") },
        { name: "Dips - Triceps Version", sets: 3, base_reps: 10, increment: 0, start_weight: null, tracked: false, image_url: IMG("Dips_-_Triceps_Version") },
        { name: "Bodyweight Walking Lunge", sets: 3, base_reps: 15, increment: 0, start_weight: null, tracked: false, image_url: IMG("Bodyweight_Walking_Lunge"), note: "per side" },
        { name: "Hanging Leg Raise",  sets: 3, base_reps: 12,   increment: 0, start_weight: null, tracked: false, image_url: IMG("Hanging_Leg_Raise") },
        { name: "Plank",              sets: 3, base_reps: null,  increment: 0, start_weight: null, tracked: false, image_url: IMG("Plank"), kind: "time", target_seconds: 60 },
      ],
    },
  ],
};

const PRESET_HOME_FAT_LOSS_CIRCUIT: StarterProgram = {
  name: "Home Fat-Loss Circuit",
  weeks: 6,
  deload_weeks: [6],
  days: [
    {
      day_number: 1,
      label: "Day 1",
      title: "Circuit A",
      exercises: [
        { name: "Goblet Squat",         sets: 3, base_reps: 15,   increment: 5, start_weight: 25,   tracked: true,  image_url: IMG("Goblet_Squat") },
        { name: "Pushups",              sets: 3, base_reps: 15,   increment: 0, start_weight: null, tracked: false, image_url: IMG("Pushups") },
        { name: "One-Arm Dumbbell Row", sets: 3, base_reps: 12,   increment: 5, start_weight: 25,   tracked: false, image_url: IMG("One-Arm_Dumbbell_Row"), note: "per side" },
        { name: "DB Reverse Lunge",     sets: 3, base_reps: 12,   increment: 5, start_weight: 15,   tracked: false, image_url: IMG("Dumbbell_Rear_Lunge"), note: "per side" },
        { name: "Mountain Climbers",    sets: 3, base_reps: null,  increment: 0, start_weight: null, tracked: false, image_url: IMG("Mountain_Climbers"), kind: "time", target_seconds: 40 },
        { name: "Jump Rope",            sets: 3, base_reps: null,  increment: 0, start_weight: null, tracked: false, image_url: IMG("Rope_Jumping"), kind: "time", target_seconds: 60 },
      ],
    },
    {
      day_number: 2,
      label: "Day 2",
      title: "Circuit B",
      exercises: [
        { name: "DB Stiff-Leg Deadlift",  sets: 3, base_reps: 15,   increment: 5, start_weight: 30,   tracked: true,  image_url: IMG("Stiff-Legged_Dumbbell_Deadlift") },
        { name: "DB Floor Press",         sets: 3, base_reps: 12,   increment: 5, start_weight: 25,   tracked: false, image_url: IMG("Dumbbell_Floor_Press") },
        { name: "Seated DB Overhead Press", sets: 3, base_reps: 12, increment: 5, start_weight: 20,   tracked: false, image_url: IMG("Seated_Dumbbell_Press") },
        { name: "Russian Twist",          sets: 3, base_reps: 20,   increment: 0, start_weight: null, tracked: false, image_url: IMG("Russian_Twist") },
        { name: "DB Kettlebell Swings",   sets: 3, base_reps: 15,   increment: 5, start_weight: 25,   tracked: false, image_url: IMG("One-Arm_Kettlebell_Swings") },
        { name: "Jump Rope",              sets: 3, base_reps: null,  increment: 0, start_weight: null, tracked: false, image_url: IMG("Rope_Jumping"), kind: "time", target_seconds: 60 },
      ],
    },
    REST(3),
    {
      day_number: 4,
      label: "Day 4",
      title: "Circuit C",
      exercises: [
        { name: "DB Step Ups",         sets: 3, base_reps: 12,   increment: 5, start_weight: 15,   tracked: false, image_url: IMG("Dumbbell_Step_Ups"), note: "per side" },
        { name: "Incline DB Press",    sets: 3, base_reps: 12,   increment: 5, start_weight: 20,   tracked: false, image_url: IMG("Incline_Dumbbell_Press") },
        { name: "DB Bicep Curl",       sets: 3, base_reps: 12,   increment: 5, start_weight: 15,   tracked: false, image_url: IMG("Dumbbell_Bicep_Curl") },
        { name: "Freehand Jump Squat", sets: 3, base_reps: 20,   increment: 0, start_weight: null, tracked: false, image_url: IMG("Freehand_Jump_Squat") },
        { name: "Plank",               sets: 3, base_reps: null,  increment: 0, start_weight: null, tracked: false, image_url: IMG("Plank"), kind: "time", target_seconds: 45 },
        { name: "Mountain Climbers",   sets: 3, base_reps: null,  increment: 0, start_weight: null, tracked: false, image_url: IMG("Mountain_Climbers"), kind: "time", target_seconds: 40 },
      ],
    },
  ],
};

const PRESET_LEAN_RECOMP_4D: StarterProgram = {
  name: "Lean Recomposition",
  weeks: 8,
  deload_weeks: [4, 8],
  days: [
    {
      day_number: 1,
      label: "Day 1",
      title: "Upper A",
      exercises: [
        { name: "Barbell Bench Press",   sets: 4, base_reps: 8,  increment: 10, start_weight: 60, tracked: true,  image_url: IMG("Barbell_Bench_Press_-_Medium_Grip"), peak_taper: true },
        { name: "Barbell Bent-Over Row", sets: 4, base_reps: 8,  increment: 10, start_weight: 60, tracked: true,  image_url: IMG("Bent_Over_Barbell_Row"),             peak_taper: true },
        { name: "Seated DB Overhead Press", sets: 3, base_reps: 10, increment: 5, start_weight: 35, tracked: false, image_url: IMG("Seated_Dumbbell_Press") },
        { name: "Lat Pulldown",          sets: 3, base_reps: 12, increment: 10, start_weight: 50, tracked: false, image_url: IMG("Wide-Grip_Lat_Pulldown"), progression_weeks: 2 },
        { name: "Cable Fly",             sets: 3, base_reps: 15, increment: 10, start_weight: 20, tracked: false, image_url: IMG("Flat_Bench_Cable_Flyes"), progression_weeks: 2 },
        { name: "Tricep Pushdown",       sets: 3, base_reps: 15, increment: 10, start_weight: 30, tracked: false, image_url: IMG("Triceps_Pushdown"), progression_weeks: 2 },
      ],
    },
    {
      day_number: 2,
      label: "Day 2",
      title: "Lower A",
      exercises: [
        { name: "Barbell Back Squat",       sets: 4, base_reps: 8,    increment: 10, start_weight: 60,   tracked: true,  image_url: IMG("Barbell_Squat"),     peak_taper: true },
        { name: "Romanian Deadlift",        sets: 3, base_reps: 10,   increment: 10, start_weight: 70,   tracked: true,  image_url: IMG("Romanian_Deadlift"), peak_taper: true },
        { name: "Leg Press",                sets: 3, base_reps: 12,   increment: 10, start_weight: 100,  tracked: false, image_url: IMG("Leg_Press"), progression_weeks: 2 },
        { name: "Lying Leg Curls",          sets: 3, base_reps: 12,   increment: 10, start_weight: 40,   tracked: false, image_url: IMG("Lying_Leg_Curls"), progression_weeks: 2 },
        { name: "Standing Calf Raises (DB)", sets: 4, base_reps: 15,  increment: 5,  start_weight: 30,   tracked: false, image_url: IMG("Standing_Calf_Raises") },
        { name: "Jump Rope",                sets: 3, base_reps: null,  increment: 0,  start_weight: null, tracked: false, image_url: IMG("Rope_Jumping"), kind: "time", target_seconds: 90 },
      ],
    },
    REST(3),
    {
      day_number: 4,
      label: "Day 4",
      title: "Upper B",
      exercises: [
        { name: "Incline DB Press",       sets: 4, base_reps: 10, increment: 5,  start_weight: 30, tracked: false, image_url: IMG("Incline_Dumbbell_Press") },
        { name: "Seated Cable Rows",      sets: 4, base_reps: 10, increment: 10, start_weight: 60, tracked: false, image_url: IMG("Seated_Cable_Rows"), progression_weeks: 2 },
        { name: "Seated Side Lateral Raise", sets: 3, base_reps: 15, increment: 5, start_weight: 15, tracked: false, image_url: IMG("Seated_Side_Lateral_Raise") },
        { name: "Face Pulls",             sets: 3, base_reps: 15, increment: 10, start_weight: 20, tracked: false, image_url: IMG("Face_Pull"), progression_weeks: 2, peak_taper: true },
        { name: "Hammer Curl",            sets: 3, base_reps: 12, increment: 5,  start_weight: 20, tracked: false, image_url: IMG("Hammer_Curls") },
        { name: "Overhead Tricep Extension", sets: 3, base_reps: 12, increment: 5, start_weight: 25, tracked: false, image_url: IMG("Seated_Triceps_Press") },
      ],
    },
    {
      day_number: 5,
      label: "Day 5",
      title: "Lower B",
      exercises: [
        { name: "Trap Bar Deadlift",      sets: 4, base_reps: 8,  increment: 10, start_weight: 80, tracked: true,  image_url: IMG("Trap_Bar_Deadlift"), peak_taper: true },
        { name: "Bulgarian Split Squat",  sets: 3, base_reps: 10, increment: 10, start_weight: 20, tracked: false, image_url: IMG("One_Leg_Barbell_Squat"), note: "per side, DB" },
        { name: "Leg Extensions",         sets: 3, base_reps: 15, increment: 10, start_weight: 40, tracked: false, image_url: IMG("Leg_Extensions"), progression_weeks: 2 },
        { name: "DB Hip Thrust",          sets: 3, base_reps: 12, increment: 5,  start_weight: 40, tracked: false, image_url: IMG("Barbell_Hip_Thrust") },
        { name: "Hanging Leg Raise",      sets: 3, base_reps: 15, increment: 0,  start_weight: null, tracked: false, image_url: IMG("Hanging_Leg_Raise") },
      ],
    },
  ],
};

const PRESET_PUSH_PULL_4D: StarterProgram = {
  name: "Push / Pull (4-Day)",
  weeks: 8,
  deload_weeks: [4, 8],
  days: [
    {
      day_number: 1,
      label: "Day 1",
      title: "Push A",
      exercises: [
        { name: "Barbell Bench Press",    sets: 4, base_reps: 8,  increment: 10, start_weight: 60, tracked: true,  image_url: IMG("Barbell_Bench_Press_-_Medium_Grip"), peak_taper: true },
        { name: "Seated DB Overhead Press", sets: 4, base_reps: 10, increment: 5, start_weight: 35, tracked: false, image_url: IMG("Seated_Dumbbell_Press"), peak_taper: true },
        { name: "Incline DB Press",       sets: 3, base_reps: 10, increment: 5,  start_weight: 30, tracked: false, image_url: IMG("Incline_Dumbbell_Press") },
        { name: "Cable Fly",              sets: 3, base_reps: 12, increment: 10, start_weight: 20, tracked: false, image_url: IMG("Flat_Bench_Cable_Flyes"), progression_weeks: 2 },
        { name: "Seated Side Lateral Raise", sets: 3, base_reps: 15, increment: 5, start_weight: 15, tracked: false, image_url: IMG("Seated_Side_Lateral_Raise") },
        { name: "Tricep Pushdown",        sets: 3, base_reps: 12, increment: 10, start_weight: 30, tracked: false, image_url: IMG("Triceps_Pushdown"), progression_weeks: 2 },
      ],
    },
    {
      day_number: 2,
      label: "Day 2",
      title: "Pull A",
      exercises: [
        { name: "Barbell Bent-Over Row", sets: 4, base_reps: 8,  increment: 10, start_weight: 60,   tracked: true,  image_url: IMG("Bent_Over_Barbell_Row"), peak_taper: true },
        { name: "Pullups",               sets: 3, base_reps: 8,  increment: 0,  start_weight: null, tracked: false, image_url: IMG("Pullups") },
        { name: "Lat Pulldown",          sets: 3, base_reps: 10, increment: 10, start_weight: 50,   tracked: false, image_url: IMG("Wide-Grip_Lat_Pulldown"), progression_weeks: 2 },
        { name: "Seated Cable Rows",     sets: 3, base_reps: 12, increment: 10, start_weight: 50,   tracked: false, image_url: IMG("Seated_Cable_Rows"), progression_weeks: 2 },
        { name: "Face Pulls",            sets: 3, base_reps: 15, increment: 10, start_weight: 20,   tracked: false, image_url: IMG("Face_Pull"), progression_weeks: 2, peak_taper: true },
        { name: "EZ Bar Curl",           sets: 3, base_reps: 12, increment: 10, start_weight: 30,   tracked: false, image_url: IMG("Close-Grip_EZ_Bar_Curl"), progression_weeks: 2 },
      ],
    },
    REST(3),
    {
      day_number: 4,
      label: "Day 4",
      title: "Push B",
      exercises: [
        { name: "Barbell Incline Bench Press", sets: 4, base_reps: 8,  increment: 10, start_weight: 50, tracked: true,  image_url: IMG("Barbell_Incline_Bench_Press_-_Medium_Grip"), peak_taper: true },
        { name: "Dumbbell Bench Press",   sets: 3, base_reps: 10, increment: 5,  start_weight: 35, tracked: false, image_url: IMG("Dumbbell_Bench_Press") },
        { name: "Arnold DB Press",        sets: 3, base_reps: 10, increment: 5,  start_weight: 25, tracked: false, image_url: IMG("Arnold_Dumbbell_Press") },
        { name: "Cable Chest Press",      sets: 3, base_reps: 12, increment: 10, start_weight: 40, tracked: false, image_url: IMG("Cable_Chest_Press"), progression_weeks: 2 },
        { name: "Seated Side Lateral Raise", sets: 3, base_reps: 15, increment: 5, start_weight: 15, tracked: false, image_url: IMG("Seated_Side_Lateral_Raise") },
        { name: "EZ-Bar Skullcrusher",    sets: 3, base_reps: 12, increment: 10, start_weight: 30, tracked: false, image_url: IMG("EZ-Bar_Skullcrusher"), progression_weeks: 2 },
      ],
    },
    {
      day_number: 5,
      label: "Day 5",
      title: "Pull B",
      exercises: [
        { name: "Barbell Deadlift",   sets: 3, base_reps: 6,  increment: 10, start_weight: 90,   tracked: true,  image_url: IMG("Barbell_Deadlift"), peak_taper: true },
        { name: "T-Bar Row",          sets: 3, base_reps: 10, increment: 10, start_weight: 50,   tracked: false, image_url: IMG("T-Bar_Row_with_Handle"), progression_weeks: 2 },
        { name: "Chin-Up",            sets: 3, base_reps: 8,  increment: 0,  start_weight: null, tracked: false, image_url: IMG("Chin-Up") },
        { name: "Seated Cable Rows",  sets: 3, base_reps: 12, increment: 10, start_weight: 50,   tracked: false, image_url: IMG("Seated_Cable_Rows"), progression_weeks: 2 },
        { name: "Barbell Shrug",      sets: 3, base_reps: 12, increment: 10, start_weight: 60,   tracked: false, image_url: IMG("Barbell_Shrug"), progression_weeks: 2 },
        { name: "Hammer Curl",        sets: 3, base_reps: 12, increment: 5,  start_weight: 20,   tracked: false, image_url: IMG("Hammer_Curls") },
      ],
    },
  ],
};

const PRESET_PPL_5D: StarterProgram = {
  name: "5-Day PPL + Upper/Lower",
  weeks: 8,
  deload_weeks: [4, 8],
  days: [
    {
      day_number: 1,
      label: "Day 1",
      title: "Push",
      exercises: [
        { name: "Barbell Bench Press",    sets: 4, base_reps: 8,  increment: 10, start_weight: 60, tracked: true,  image_url: IMG("Barbell_Bench_Press_-_Medium_Grip"), peak_taper: true },
        { name: "Seated DB Overhead Press", sets: 3, base_reps: 10, increment: 5, start_weight: 35, tracked: false, image_url: IMG("Seated_Dumbbell_Press") },
        { name: "Incline DB Press",       sets: 3, base_reps: 10, increment: 5,  start_weight: 30, tracked: false, image_url: IMG("Incline_Dumbbell_Press") },
        { name: "Cable Fly",              sets: 3, base_reps: 12, increment: 10, start_weight: 20, tracked: false, image_url: IMG("Flat_Bench_Cable_Flyes"), progression_weeks: 2 },
        { name: "Tricep Pushdown",        sets: 3, base_reps: 12, increment: 10, start_weight: 30, tracked: false, image_url: IMG("Triceps_Pushdown"), progression_weeks: 2 },
      ],
    },
    {
      day_number: 2,
      label: "Day 2",
      title: "Pull",
      exercises: [
        { name: "Barbell Bent-Over Row", sets: 4, base_reps: 8,  increment: 10, start_weight: 60, tracked: true,  image_url: IMG("Bent_Over_Barbell_Row"), peak_taper: true },
        { name: "Lat Pulldown",          sets: 3, base_reps: 10, increment: 10, start_weight: 50, tracked: false, image_url: IMG("Wide-Grip_Lat_Pulldown"), progression_weeks: 2 },
        { name: "Seated Cable Rows",     sets: 3, base_reps: 12, increment: 10, start_weight: 50, tracked: false, image_url: IMG("Seated_Cable_Rows"), progression_weeks: 2 },
        { name: "Face Pulls",            sets: 3, base_reps: 15, increment: 10, start_weight: 20, tracked: false, image_url: IMG("Face_Pull"), progression_weeks: 2, peak_taper: true },
        { name: "EZ Bar Curl",           sets: 3, base_reps: 12, increment: 10, start_weight: 30, tracked: false, image_url: IMG("Close-Grip_EZ_Bar_Curl"), progression_weeks: 2 },
      ],
    },
    {
      day_number: 3,
      label: "Day 3",
      title: "Legs",
      exercises: [
        { name: "Barbell Back Squat",       sets: 4, base_reps: 8,  increment: 10, start_weight: 60,  tracked: true,  image_url: IMG("Barbell_Squat"),     peak_taper: true },
        { name: "Romanian Deadlift",        sets: 3, base_reps: 10, increment: 10, start_weight: 70,  tracked: true,  image_url: IMG("Romanian_Deadlift"), peak_taper: true },
        { name: "Leg Press",                sets: 3, base_reps: 12, increment: 10, start_weight: 100, tracked: false, image_url: IMG("Leg_Press"), progression_weeks: 2 },
        { name: "Lying Leg Curls",          sets: 3, base_reps: 12, increment: 10, start_weight: 40,  tracked: false, image_url: IMG("Lying_Leg_Curls"), progression_weeks: 2 },
        { name: "Standing Calf Raises (DB)", sets: 4, base_reps: 15, increment: 5, start_weight: 30,  tracked: false, image_url: IMG("Standing_Calf_Raises") },
      ],
    },
    REST(4),
    {
      day_number: 5,
      label: "Day 5",
      title: "Upper",
      exercises: [
        { name: "Incline DB Press",       sets: 4, base_reps: 10, increment: 5,  start_weight: 30, tracked: false, image_url: IMG("Incline_Dumbbell_Press") },
        { name: "Seated Cable Rows",      sets: 4, base_reps: 10, increment: 10, start_weight: 60, tracked: false, image_url: IMG("Seated_Cable_Rows"), progression_weeks: 2 },
        { name: "Seated DB Overhead Press", sets: 3, base_reps: 10, increment: 5, start_weight: 30, tracked: false, image_url: IMG("Seated_Dumbbell_Press") },
        { name: "Seated Side Lateral Raise", sets: 3, base_reps: 15, increment: 5, start_weight: 15, tracked: false, image_url: IMG("Seated_Side_Lateral_Raise") },
        { name: "Hammer Curl",            sets: 3, base_reps: 12, increment: 5,  start_weight: 20, tracked: false, image_url: IMG("Hammer_Curls") },
        { name: "Overhead Tricep Extension", sets: 3, base_reps: 12, increment: 5, start_weight: 25, tracked: false, image_url: IMG("Seated_Triceps_Press") },
      ],
    },
    {
      day_number: 6,
      label: "Day 6",
      title: "Lower",
      exercises: [
        { name: "Trap Bar Deadlift",      sets: 4, base_reps: 8,  increment: 10, start_weight: 80, tracked: true,  image_url: IMG("Trap_Bar_Deadlift"), peak_taper: true },
        { name: "Bulgarian Split Squat",  sets: 3, base_reps: 10, increment: 10, start_weight: 20, tracked: false, image_url: IMG("One_Leg_Barbell_Squat"), note: "per side, DB" },
        { name: "Leg Extensions",         sets: 3, base_reps: 15, increment: 10, start_weight: 40, tracked: false, image_url: IMG("Leg_Extensions"), progression_weeks: 2 },
        { name: "DB Hip Thrust",          sets: 3, base_reps: 12, increment: 5,  start_weight: 40, tracked: false, image_url: IMG("Barbell_Hip_Thrust") },
        { name: "Standing Calf Raises (DB)", sets: 4, base_reps: 15, increment: 5, start_weight: 30, tracked: false, image_url: IMG("Standing_Calf_Raises") },
      ],
    },
  ],
};

const PRESET_LEAN_ATHLETE_5D: StarterProgram = {
  name: "5-Day Lean Athlete",
  weeks: 8,
  deload_weeks: [4, 8],
  days: [
    {
      day_number: 1,
      label: "Day 1",
      title: "Push A",
      exercises: [
        { name: "Barbell Back Squat",     sets: 4, base_reps: 8,  increment: 10, start_weight: 60,   tracked: true,  image_url: IMG("Barbell_Squat"),                     peak_taper: true },
        { name: "Barbell Bench Press",    sets: 3, base_reps: 10, increment: 10, start_weight: 50,   tracked: true,  image_url: IMG("Barbell_Bench_Press_-_Medium_Grip"), peak_taper: true },
        { name: "Seated DB Overhead Press", sets: 3, base_reps: 10, increment: 5, start_weight: 30,  tracked: false, image_url: IMG("Seated_Dumbbell_Press") },
        { name: "Leg Extensions",         sets: 3, base_reps: 15, increment: 10, start_weight: 40,   tracked: false, image_url: IMG("Leg_Extensions"), progression_weeks: 2 },
        { name: "Tricep Pushdown",        sets: 3, base_reps: 12, increment: 10, start_weight: 30,   tracked: false, image_url: IMG("Triceps_Pushdown"), progression_weeks: 2 },
        { name: "Jump Rope",              sets: 3, base_reps: null, increment: 0, start_weight: null, tracked: false, image_url: IMG("Rope_Jumping"), kind: "time", target_seconds: 90 },
      ],
    },
    {
      day_number: 2,
      label: "Day 2",
      title: "Pull A",
      exercises: [
        { name: "Romanian Deadlift",  sets: 4, base_reps: 8,  increment: 10, start_weight: 70,   tracked: true,  image_url: IMG("Romanian_Deadlift"), peak_taper: true },
        { name: "Pullups",            sets: 3, base_reps: 8,  increment: 0,  start_weight: null, tracked: false, image_url: IMG("Pullups") },
        { name: "Seated Cable Rows",  sets: 3, base_reps: 12, increment: 10, start_weight: 50,   tracked: false, image_url: IMG("Seated_Cable_Rows"), progression_weeks: 2 },
        { name: "Lying Leg Curls",    sets: 3, base_reps: 12, increment: 10, start_weight: 40,   tracked: false, image_url: IMG("Lying_Leg_Curls"), progression_weeks: 2 },
        { name: "EZ Bar Curl",        sets: 3, base_reps: 12, increment: 10, start_weight: 30,   tracked: false, image_url: IMG("Close-Grip_EZ_Bar_Curl"), progression_weeks: 2 },
        { name: "Hanging Leg Raise",  sets: 3, base_reps: 15, increment: 0,  start_weight: null, tracked: false, image_url: IMG("Hanging_Leg_Raise") },
      ],
    },
    {
      day_number: 3,
      label: "Day 3",
      title: "Push B",
      exercises: [
        { name: "Front Squat",        sets: 3, base_reps: 10, increment: 10, start_weight: 50,   tracked: true,  image_url: IMG("Front_Squat_Clean_Grip"), peak_taper: true },
        { name: "Incline DB Press",   sets: 4, base_reps: 10, increment: 5,  start_weight: 30,   tracked: false, image_url: IMG("Incline_Dumbbell_Press") },
        { name: "Seated Side Lateral Raise", sets: 3, base_reps: 15, increment: 5, start_weight: 15, tracked: false, image_url: IMG("Seated_Side_Lateral_Raise") },
        { name: "Cable Fly",          sets: 3, base_reps: 12, increment: 10, start_weight: 20,   tracked: false, image_url: IMG("Flat_Bench_Cable_Flyes"), progression_weeks: 2 },
        { name: "EZ-Bar Skullcrusher", sets: 3, base_reps: 12, increment: 10, start_weight: 30,  tracked: false, image_url: IMG("EZ-Bar_Skullcrusher"), progression_weeks: 2 },
        { name: "Mountain Climbers",  sets: 3, base_reps: null, increment: 0, start_weight: null, tracked: false, image_url: IMG("Mountain_Climbers"), kind: "time", target_seconds: 45 },
      ],
    },
    {
      day_number: 4,
      label: "Day 4",
      title: "Pull B",
      exercises: [
        { name: "Trap Bar Deadlift",  sets: 4, base_reps: 8,  increment: 10, start_weight: 80, tracked: true,  image_url: IMG("Trap_Bar_Deadlift"), peak_taper: true },
        { name: "Lat Pulldown",       sets: 3, base_reps: 10, increment: 10, start_weight: 50, tracked: false, image_url: IMG("Wide-Grip_Lat_Pulldown"), progression_weeks: 2 },
        { name: "One-Arm Dumbbell Row", sets: 3, base_reps: 10, increment: 5, start_weight: 30, tracked: false, image_url: IMG("One-Arm_Dumbbell_Row"), note: "per side" },
        { name: "Face Pulls",         sets: 3, base_reps: 15, increment: 10, start_weight: 20, tracked: false, image_url: IMG("Face_Pull"), progression_weeks: 2, peak_taper: true },
        { name: "Hammer Curl",        sets: 3, base_reps: 12, increment: 5,  start_weight: 20, tracked: false, image_url: IMG("Hammer_Curls") },
        { name: "Russian Twist",      sets: 3, base_reps: 20, increment: 0,  start_weight: null, tracked: false, image_url: IMG("Russian_Twist") },
      ],
    },
    {
      day_number: 5,
      label: "Day 5",
      title: "Conditioning",
      exercises: [
        { name: "Freehand Jump Squat", sets: 3, base_reps: 20,   increment: 0, start_weight: null, tracked: false, image_url: IMG("Freehand_Jump_Squat") },
        { name: "DB Kettlebell Swings", sets: 4, base_reps: 15,  increment: 5, start_weight: 30,   tracked: false, image_url: IMG("One-Arm_Kettlebell_Swings") },
        { name: "Goblet Squat",        sets: 3, base_reps: 15,   increment: 5, start_weight: 30,   tracked: false, image_url: IMG("Goblet_Squat") },
        { name: "Mountain Climbers",   sets: 3, base_reps: null,  increment: 0, start_weight: null, tracked: false, image_url: IMG("Mountain_Climbers"), kind: "time", target_seconds: 45 },
        { name: "Jump Rope",           sets: 3, base_reps: null,  increment: 0, start_weight: null, tracked: false, image_url: IMG("Rope_Jumping"), kind: "time", target_seconds: 120 },
        { name: "Plank",               sets: 3, base_reps: null,  increment: 0, start_weight: null, tracked: false, image_url: IMG("Plank"), kind: "time", target_seconds: 60 },
      ],
    },
  ],
};

const PRESET_PPL_6D: StarterProgram = {
  name: "6-Day PPL",
  weeks: 8,
  deload_weeks: [4, 8],
  days: [
    {
      day_number: 1,
      label: "Day 1",
      title: "Push A",
      exercises: [
        { name: "Barbell Bench Press",    sets: 4, base_reps: 8,  increment: 10, start_weight: 60, tracked: true,  image_url: IMG("Barbell_Bench_Press_-_Medium_Grip"), peak_taper: true },
        { name: "Seated DB Overhead Press", sets: 3, base_reps: 10, increment: 5, start_weight: 35, tracked: false, image_url: IMG("Seated_Dumbbell_Press") },
        { name: "Incline DB Press",       sets: 3, base_reps: 10, increment: 5,  start_weight: 30, tracked: false, image_url: IMG("Incline_Dumbbell_Press") },
        { name: "Cable Fly",              sets: 3, base_reps: 12, increment: 10, start_weight: 20, tracked: false, image_url: IMG("Flat_Bench_Cable_Flyes"), progression_weeks: 2 },
        { name: "Tricep Pushdown",        sets: 3, base_reps: 12, increment: 10, start_weight: 30, tracked: false, image_url: IMG("Triceps_Pushdown"), progression_weeks: 2 },
      ],
    },
    {
      day_number: 2,
      label: "Day 2",
      title: "Pull A",
      exercises: [
        { name: "Barbell Bent-Over Row", sets: 4, base_reps: 8,  increment: 10, start_weight: 60, tracked: true,  image_url: IMG("Bent_Over_Barbell_Row"), peak_taper: true },
        { name: "Lat Pulldown",          sets: 3, base_reps: 10, increment: 10, start_weight: 50, tracked: false, image_url: IMG("Wide-Grip_Lat_Pulldown"), progression_weeks: 2 },
        { name: "Seated Cable Rows",     sets: 3, base_reps: 12, increment: 10, start_weight: 50, tracked: false, image_url: IMG("Seated_Cable_Rows"), progression_weeks: 2 },
        { name: "Face Pulls",            sets: 3, base_reps: 15, increment: 10, start_weight: 20, tracked: false, image_url: IMG("Face_Pull"), progression_weeks: 2, peak_taper: true },
        { name: "EZ Bar Curl",           sets: 3, base_reps: 12, increment: 10, start_weight: 30, tracked: false, image_url: IMG("Close-Grip_EZ_Bar_Curl"), progression_weeks: 2 },
      ],
    },
    {
      day_number: 3,
      label: "Day 3",
      title: "Legs A",
      exercises: [
        { name: "Barbell Back Squat",       sets: 4, base_reps: 8,  increment: 10, start_weight: 60,  tracked: true,  image_url: IMG("Barbell_Squat"),     peak_taper: true },
        { name: "Romanian Deadlift",        sets: 3, base_reps: 10, increment: 10, start_weight: 70,  tracked: true,  image_url: IMG("Romanian_Deadlift"), peak_taper: true },
        { name: "Leg Press",                sets: 3, base_reps: 12, increment: 10, start_weight: 100, tracked: false, image_url: IMG("Leg_Press"), progression_weeks: 2 },
        { name: "Standing Calf Raises (DB)", sets: 4, base_reps: 15, increment: 5, start_weight: 30,  tracked: false, image_url: IMG("Standing_Calf_Raises") },
      ],
    },
    {
      day_number: 4,
      label: "Day 4",
      title: "Push B",
      exercises: [
        { name: "Barbell Incline Bench Press", sets: 4, base_reps: 8,  increment: 10, start_weight: 50, tracked: true,  image_url: IMG("Barbell_Incline_Bench_Press_-_Medium_Grip"), peak_taper: true },
        { name: "Dumbbell Bench Press",   sets: 3, base_reps: 10, increment: 5,  start_weight: 35, tracked: false, image_url: IMG("Dumbbell_Bench_Press") },
        { name: "Seated Side Lateral Raise", sets: 3, base_reps: 15, increment: 5, start_weight: 15, tracked: false, image_url: IMG("Seated_Side_Lateral_Raise") },
        { name: "Cable Chest Press",      sets: 3, base_reps: 12, increment: 10, start_weight: 40, tracked: false, image_url: IMG("Cable_Chest_Press"), progression_weeks: 2 },
        { name: "EZ-Bar Skullcrusher",    sets: 3, base_reps: 12, increment: 10, start_weight: 30, tracked: false, image_url: IMG("EZ-Bar_Skullcrusher"), progression_weeks: 2 },
      ],
    },
    {
      day_number: 5,
      label: "Day 5",
      title: "Pull B",
      exercises: [
        { name: "Barbell Deadlift", sets: 3, base_reps: 6,  increment: 10, start_weight: 90,   tracked: true,  image_url: IMG("Barbell_Deadlift"), peak_taper: true },
        { name: "Pullups",          sets: 3, base_reps: 8,  increment: 0,  start_weight: null, tracked: false, image_url: IMG("Pullups") },
        { name: "T-Bar Row",        sets: 3, base_reps: 10, increment: 10, start_weight: 50,   tracked: false, image_url: IMG("T-Bar_Row_with_Handle"), progression_weeks: 2 },
        { name: "Barbell Shrug",    sets: 3, base_reps: 12, increment: 10, start_weight: 60,   tracked: false, image_url: IMG("Barbell_Shrug"), progression_weeks: 2 },
        { name: "Hammer Curl",      sets: 3, base_reps: 12, increment: 5,  start_weight: 20,   tracked: false, image_url: IMG("Hammer_Curls") },
      ],
    },
    {
      day_number: 6,
      label: "Day 6",
      title: "Legs B",
      exercises: [
        { name: "Front Squat",       sets: 4, base_reps: 8,  increment: 10, start_weight: 50, tracked: true,  image_url: IMG("Front_Squat_Clean_Grip"), peak_taper: true },
        { name: "Bulgarian Split Squat", sets: 3, base_reps: 10, increment: 10, start_weight: 20, tracked: false, image_url: IMG("One_Leg_Barbell_Squat"), note: "per side, DB" },
        { name: "Lying Leg Curls",   sets: 3, base_reps: 12, increment: 10, start_weight: 40, tracked: false, image_url: IMG("Lying_Leg_Curls"), progression_weeks: 2 },
        { name: "Leg Extensions",    sets: 3, base_reps: 15, increment: 10, start_weight: 40, tracked: false, image_url: IMG("Leg_Extensions"), progression_weeks: 2 },
        { name: "Standing Calf Raises (DB)", sets: 4, base_reps: 15, increment: 5, start_weight: 30, tracked: false, image_url: IMG("Standing_Calf_Raises") },
      ],
    },
  ],
};

const PRESET_PUSH_PULL_6D: StarterProgram = {
  name: "6-Day Push / Pull",
  weeks: 8,
  deload_weeks: [4, 8],
  days: [
    {
      day_number: 1,
      label: "Day 1",
      title: "Push A",
      exercises: [
        { name: "Barbell Bench Press",    sets: 4, base_reps: 8,  increment: 10, start_weight: 60, tracked: true,  image_url: IMG("Barbell_Bench_Press_-_Medium_Grip"), peak_taper: true },
        { name: "Seated DB Overhead Press", sets: 3, base_reps: 10, increment: 5, start_weight: 35, tracked: false, image_url: IMG("Seated_Dumbbell_Press") },
        { name: "Incline DB Press",       sets: 3, base_reps: 10, increment: 5,  start_weight: 30, tracked: false, image_url: IMG("Incline_Dumbbell_Press") },
        { name: "Cable Fly",              sets: 3, base_reps: 12, increment: 10, start_weight: 20, tracked: false, image_url: IMG("Flat_Bench_Cable_Flyes"), progression_weeks: 2 },
        { name: "Tricep Pushdown",        sets: 3, base_reps: 12, increment: 10, start_weight: 30, tracked: false, image_url: IMG("Triceps_Pushdown"), progression_weeks: 2 },
      ],
    },
    {
      day_number: 2,
      label: "Day 2",
      title: "Pull A",
      exercises: [
        { name: "Barbell Bent-Over Row", sets: 4, base_reps: 8,  increment: 10, start_weight: 60, tracked: true,  image_url: IMG("Bent_Over_Barbell_Row"), peak_taper: true },
        { name: "Lat Pulldown",          sets: 3, base_reps: 10, increment: 10, start_weight: 50, tracked: false, image_url: IMG("Wide-Grip_Lat_Pulldown"), progression_weeks: 2 },
        { name: "Seated Cable Rows",     sets: 3, base_reps: 12, increment: 10, start_weight: 50, tracked: false, image_url: IMG("Seated_Cable_Rows"), progression_weeks: 2 },
        { name: "Face Pulls",            sets: 3, base_reps: 15, increment: 10, start_weight: 20, tracked: false, image_url: IMG("Face_Pull"), progression_weeks: 2, peak_taper: true },
        { name: "EZ Bar Curl",           sets: 3, base_reps: 12, increment: 10, start_weight: 30, tracked: false, image_url: IMG("Close-Grip_EZ_Bar_Curl"), progression_weeks: 2 },
      ],
    },
    {
      day_number: 3,
      label: "Day 3",
      title: "Push B",
      exercises: [
        { name: "Barbell Incline Bench Press", sets: 4, base_reps: 8,  increment: 10, start_weight: 50, tracked: true,  image_url: IMG("Barbell_Incline_Bench_Press_-_Medium_Grip"), peak_taper: true },
        { name: "Arnold DB Press",        sets: 3, base_reps: 10, increment: 5,  start_weight: 25, tracked: false, image_url: IMG("Arnold_Dumbbell_Press") },
        { name: "Cable Chest Press",      sets: 3, base_reps: 12, increment: 10, start_weight: 40, tracked: false, image_url: IMG("Cable_Chest_Press"), progression_weeks: 2 },
        { name: "Seated Side Lateral Raise", sets: 3, base_reps: 15, increment: 5, start_weight: 15, tracked: false, image_url: IMG("Seated_Side_Lateral_Raise") },
        { name: "EZ-Bar Skullcrusher",    sets: 3, base_reps: 12, increment: 10, start_weight: 30, tracked: false, image_url: IMG("EZ-Bar_Skullcrusher"), progression_weeks: 2 },
      ],
    },
    {
      day_number: 4,
      label: "Day 4",
      title: "Pull B",
      exercises: [
        { name: "Barbell Deadlift", sets: 3, base_reps: 6,  increment: 10, start_weight: 90,   tracked: true,  image_url: IMG("Barbell_Deadlift"), peak_taper: true },
        { name: "T-Bar Row",        sets: 3, base_reps: 10, increment: 10, start_weight: 50,   tracked: false, image_url: IMG("T-Bar_Row_with_Handle"), progression_weeks: 2 },
        { name: "Pullups",          sets: 3, base_reps: 8,  increment: 0,  start_weight: null, tracked: false, image_url: IMG("Pullups") },
        { name: "Barbell Shrug",    sets: 3, base_reps: 12, increment: 10, start_weight: 60,   tracked: false, image_url: IMG("Barbell_Shrug"), progression_weeks: 2 },
        { name: "Hammer Curl",      sets: 3, base_reps: 12, increment: 5,  start_weight: 20,   tracked: false, image_url: IMG("Hammer_Curls") },
      ],
    },
    {
      day_number: 5,
      label: "Day 5",
      title: "Push C (Legs)",
      exercises: [
        { name: "Barbell Back Squat",     sets: 4, base_reps: 8,  increment: 10, start_weight: 60,  tracked: true,  image_url: IMG("Barbell_Squat"), peak_taper: true },
        { name: "Leg Press",              sets: 3, base_reps: 12, increment: 10, start_weight: 100, tracked: false, image_url: IMG("Leg_Press"), progression_weeks: 2 },
        { name: "Seated DB Overhead Press", sets: 3, base_reps: 10, increment: 5, start_weight: 30, tracked: false, image_url: IMG("Seated_Dumbbell_Press") },
        { name: "Leg Extensions",         sets: 3, base_reps: 15, increment: 10, start_weight: 40,  tracked: false, image_url: IMG("Leg_Extensions"), progression_weeks: 2 },
        { name: "Standing Calf Raises (DB)", sets: 4, base_reps: 15, increment: 5, start_weight: 30, tracked: false, image_url: IMG("Standing_Calf_Raises") },
      ],
    },
    {
      day_number: 6,
      label: "Day 6",
      title: "Pull C (Legs)",
      exercises: [
        { name: "Romanian Deadlift", sets: 4, base_reps: 8,  increment: 10, start_weight: 70, tracked: true,  image_url: IMG("Romanian_Deadlift"), peak_taper: true },
        { name: "Seated Cable Rows", sets: 3, base_reps: 12, increment: 10, start_weight: 50, tracked: false, image_url: IMG("Seated_Cable_Rows"), progression_weeks: 2 },
        { name: "Lying Leg Curls",   sets: 3, base_reps: 12, increment: 10, start_weight: 40, tracked: false, image_url: IMG("Lying_Leg_Curls"), progression_weeks: 2 },
        { name: "DB Hip Thrust",     sets: 3, base_reps: 12, increment: 5,  start_weight: 40, tracked: false, image_url: IMG("Barbell_Hip_Thrust") },
        { name: "Concentration Curls", sets: 3, base_reps: 12, increment: 5, start_weight: 15, tracked: false, image_url: IMG("Concentration_Curls") },
      ],
    },
  ],
};

const PRESET_UPPER_LOWER_2X: StarterProgram = {
  name: "2-Day Upper / Lower",
  weeks: 8,
  deload_weeks: [4, 8],
  days: [
    {
      day_number: 1,
      label: "Day 1",
      title: "Upper",
      exercises: [
        { name: "Barbell Bench Press",      sets: 3, base_reps: 10, increment: 10, start_weight: 50, tracked: true,  image_url: IMG("Barbell_Bench_Press_-_Medium_Grip"), peak_taper: true },
        { name: "Barbell Bent-Over Row",    sets: 3, base_reps: 10, increment: 10, start_weight: 50, tracked: true,  image_url: IMG("Bent_Over_Barbell_Row"),             peak_taper: true },
        { name: "Seated DB Overhead Press", sets: 3, base_reps: 10, increment: 5,  start_weight: 30, tracked: false, image_url: IMG("Seated_Dumbbell_Press") },
        { name: "Lat Pulldown",             sets: 3, base_reps: 10, increment: 10, start_weight: 50, tracked: false, image_url: IMG("Wide-Grip_Lat_Pulldown"), progression_weeks: 2 },
        { name: "EZ Bar Curl",              sets: 2, base_reps: 12, increment: 10, start_weight: 30, tracked: false, image_url: IMG("Close-Grip_EZ_Bar_Curl"), progression_weeks: 2 },
        { name: "Tricep Pushdown",          sets: 2, base_reps: 12, increment: 10, start_weight: 30, tracked: false, image_url: IMG("Triceps_Pushdown"), progression_weeks: 2 },
      ],
    },
    REST(2),
    {
      day_number: 3,
      label: "Day 3",
      title: "Lower",
      exercises: [
        { name: "Barbell Back Squat",        sets: 3, base_reps: 10, increment: 10, start_weight: 60,   tracked: true,  image_url: IMG("Barbell_Squat"),     peak_taper: true },
        { name: "Romanian Deadlift",         sets: 3, base_reps: 10, increment: 10, start_weight: 60,   tracked: true,  image_url: IMG("Romanian_Deadlift"), peak_taper: true },
        { name: "DB Lunges",                 sets: 3, base_reps: 10, increment: 5,  start_weight: 15,   tracked: false, image_url: IMG("Dumbbell_Lunges"), note: "per side" },
        { name: "DB Hip Thrust",             sets: 3, base_reps: 12, increment: 5,  start_weight: 35,   tracked: false, image_url: IMG("Barbell_Hip_Thrust") },
        { name: "Standing Calf Raises (DB)", sets: 3, base_reps: 15, increment: 5,  start_weight: 30,   tracked: false, image_url: IMG("Standing_Calf_Raises") },
        { name: "Plank",                     sets: 3, base_reps: null, increment: 0, start_weight: null, tracked: false, image_url: IMG("Plank"), kind: "time", target_seconds: 45 },
      ],
    },
  ],
};

const PRESET_FULL_BODY_STRENGTH_2X: StarterProgram = {
  name: "2-Day Full Body Strength",
  weeks: 8,
  deload_weeks: [4, 8],
  days: [
    {
      day_number: 1,
      label: "Day 1",
      title: "Full Body Strength A",
      exercises: [
        { name: "Barbell Back Squat",       sets: 4, base_reps: 6,  increment: 10, start_weight: 70, tracked: true,  image_url: IMG("Barbell_Squat"),                     peak_taper: true },
        { name: "Barbell Bench Press",      sets: 4, base_reps: 6,  increment: 10, start_weight: 60, tracked: true,  image_url: IMG("Barbell_Bench_Press_-_Medium_Grip"), peak_taper: true },
        { name: "Barbell Bent-Over Row",    sets: 4, base_reps: 6,  increment: 10, start_weight: 60, tracked: true,  image_url: IMG("Bent_Over_Barbell_Row"),             peak_taper: true },
        { name: "Seated DB Overhead Press", sets: 3, base_reps: 8,  increment: 5,  start_weight: 35, tracked: false, image_url: IMG("Seated_Dumbbell_Press") },
        { name: "EZ Bar Curl",              sets: 2, base_reps: 10, increment: 10, start_weight: 30, tracked: false, image_url: IMG("Close-Grip_EZ_Bar_Curl"), progression_weeks: 2 },
      ],
    },
    REST(2),
    {
      day_number: 3,
      label: "Day 3",
      title: "Full Body Strength B",
      exercises: [
        { name: "Barbell Deadlift",            sets: 4, base_reps: 5,  increment: 10, start_weight: 100,  tracked: true,  image_url: IMG("Barbell_Deadlift"), peak_taper: true },
        { name: "Barbell Incline Bench Press", sets: 4, base_reps: 6,  increment: 10, start_weight: 50,   tracked: true,  image_url: IMG("Barbell_Incline_Bench_Press_-_Medium_Grip"), peak_taper: true },
        { name: "Lat Pulldown",                sets: 3, base_reps: 8,  increment: 10, start_weight: 50,   tracked: false, image_url: IMG("Wide-Grip_Lat_Pulldown"), progression_weeks: 2 },
        { name: "Bulgarian Split Squat",       sets: 3, base_reps: 8,  increment: 10, start_weight: 20,   tracked: false, image_url: IMG("One_Leg_Barbell_Squat"), note: "per side, DB" },
        { name: "Standing Calf Raises (DB)",   sets: 3, base_reps: 12, increment: 5,  start_weight: 30,   tracked: false, image_url: IMG("Standing_Calf_Raises") },
        { name: "Plank",                       sets: 3, base_reps: null, increment: 0, start_weight: null, tracked: false, image_url: IMG("Plank"), kind: "time", target_seconds: 45 },
      ],
    },
  ],
};

// ── Goal-coverage fillers ──────────────────────────────────────────────────
// One program per (day-section × goal) gap, so each "N Days a Week" section
// offers all three goals (Get Lean / Build Muscle / Overall Fitness).

const PRESET_LEAN_CIRCUIT_2X: StarterProgram = {
  name: "2-Day Lean Circuit",
  weeks: 8,
  deload_weeks: [4, 8],
  days: [
    {
      day_number: 1,
      label: "Day 1",
      title: "Circuit A",
      exercises: [
        { name: "Goblet Squat",         sets: 3, base_reps: 15,   increment: 5, start_weight: 30,   tracked: true,  image_url: IMG("Goblet_Squat") },
        { name: "Dumbbell Bench Press",  sets: 3, base_reps: 12,   increment: 5, start_weight: 30,   tracked: false, image_url: IMG("Dumbbell_Bench_Press") },
        { name: "One-Arm Dumbbell Row",  sets: 3, base_reps: 12,   increment: 5, start_weight: 30,   tracked: false, image_url: IMG("One-Arm_Dumbbell_Row"), note: "per side" },
        { name: "Seated DB Overhead Press", sets: 3, base_reps: 12, increment: 5, start_weight: 20,  tracked: false, image_url: IMG("Seated_Dumbbell_Press") },
        { name: "Mountain Climbers",     sets: 3, base_reps: null,  increment: 0, start_weight: null, tracked: false, image_url: IMG("Mountain_Climbers"), kind: "time", target_seconds: 40 },
        { name: "Jump Rope",             sets: 3, base_reps: null,  increment: 0, start_weight: null, tracked: false, image_url: IMG("Rope_Jumping"), kind: "time", target_seconds: 90 },
      ],
    },
    REST(2),
    {
      day_number: 3,
      label: "Day 3",
      title: "Circuit B",
      exercises: [
        { name: "DB Stiff-Leg Deadlift", sets: 3, base_reps: 15,   increment: 5, start_weight: 35,   tracked: true,  image_url: IMG("Stiff-Legged_Dumbbell_Deadlift") },
        { name: "Incline DB Press",      sets: 3, base_reps: 12,   increment: 5, start_weight: 25,   tracked: false, image_url: IMG("Incline_Dumbbell_Press") },
        { name: "DB Reverse Lunge",      sets: 3, base_reps: 12,   increment: 5, start_weight: 15,   tracked: false, image_url: IMG("Dumbbell_Rear_Lunge"), note: "per side" },
        { name: "DB Kettlebell Swings",  sets: 3, base_reps: 15,   increment: 5, start_weight: 30,   tracked: false, image_url: IMG("One-Arm_Kettlebell_Swings") },
        { name: "Russian Twist",         sets: 3, base_reps: 20,   increment: 0, start_weight: null, tracked: false, image_url: IMG("Russian_Twist") },
        { name: "Jump Rope",             sets: 3, base_reps: null,  increment: 0, start_weight: null, tracked: false, image_url: IMG("Rope_Jumping"), kind: "time", target_seconds: 90 },
      ],
    },
  ],
};

const PRESET_UPPER_LOWER_FITNESS_4D: StarterProgram = {
  name: "4-Day Upper / Lower Fitness",
  weeks: 8,
  deload_weeks: [4, 8],
  days: [
    {
      day_number: 1,
      label: "Day 1",
      title: "Upper A",
      exercises: [
        { name: "Barbell Bench Press",   sets: 3, base_reps: 10, increment: 10, start_weight: 50, tracked: true,  image_url: IMG("Barbell_Bench_Press_-_Medium_Grip"), peak_taper: true },
        { name: "Barbell Bent-Over Row", sets: 3, base_reps: 10, increment: 10, start_weight: 50, tracked: true,  image_url: IMG("Bent_Over_Barbell_Row"),             peak_taper: true },
        { name: "Seated DB Overhead Press", sets: 3, base_reps: 10, increment: 5, start_weight: 30, tracked: false, image_url: IMG("Seated_Dumbbell_Press") },
        { name: "Lat Pulldown",          sets: 3, base_reps: 12, increment: 10, start_weight: 50, tracked: false, image_url: IMG("Wide-Grip_Lat_Pulldown"), progression_weeks: 2 },
        { name: "DB Bicep Curl",         sets: 2, base_reps: 12, increment: 5,  start_weight: 15, tracked: false, image_url: IMG("Dumbbell_Bicep_Curl") },
        { name: "Tricep Pushdown",       sets: 2, base_reps: 12, increment: 10, start_weight: 30, tracked: false, image_url: IMG("Triceps_Pushdown"), progression_weeks: 2 },
      ],
    },
    {
      day_number: 2,
      label: "Day 2",
      title: "Lower A",
      exercises: [
        { name: "Barbell Back Squat",        sets: 3, base_reps: 10,   increment: 10, start_weight: 60,   tracked: true,  image_url: IMG("Barbell_Squat"),     peak_taper: true },
        { name: "Romanian Deadlift",         sets: 3, base_reps: 10,   increment: 10, start_weight: 60,   tracked: true,  image_url: IMG("Romanian_Deadlift"), peak_taper: true },
        { name: "Leg Press",                 sets: 3, base_reps: 12,   increment: 10, start_weight: 90,   tracked: false, image_url: IMG("Leg_Press"), progression_weeks: 2 },
        { name: "Standing Calf Raises (DB)", sets: 3, base_reps: 15,   increment: 5,  start_weight: 30,   tracked: false, image_url: IMG("Standing_Calf_Raises") },
        { name: "Plank",                     sets: 3, base_reps: null,  increment: 0,  start_weight: null, tracked: false, image_url: IMG("Plank"), kind: "time", target_seconds: 45 },
      ],
    },
    REST(3),
    {
      day_number: 4,
      label: "Day 4",
      title: "Upper B",
      exercises: [
        { name: "Incline DB Press",       sets: 3, base_reps: 10, increment: 5,  start_weight: 25, tracked: false, image_url: IMG("Incline_Dumbbell_Press") },
        { name: "Seated Cable Rows",      sets: 3, base_reps: 12, increment: 10, start_weight: 50, tracked: false, image_url: IMG("Seated_Cable_Rows"), progression_weeks: 2 },
        { name: "Seated Side Lateral Raise", sets: 3, base_reps: 15, increment: 5, start_weight: 15, tracked: false, image_url: IMG("Seated_Side_Lateral_Raise") },
        { name: "Face Pulls",             sets: 3, base_reps: 15, increment: 10, start_weight: 20, tracked: false, image_url: IMG("Face_Pull"), progression_weeks: 2 },
        { name: "Hammer Curl",            sets: 2, base_reps: 12, increment: 5,  start_weight: 15, tracked: false, image_url: IMG("Hammer_Curls") },
        { name: "Overhead Tricep Extension", sets: 2, base_reps: 12, increment: 5, start_weight: 20, tracked: false, image_url: IMG("Seated_Triceps_Press") },
      ],
    },
    {
      day_number: 5,
      label: "Day 5",
      title: "Lower B",
      exercises: [
        { name: "DB Lunges",                 sets: 3, base_reps: 12, increment: 5,  start_weight: 15, tracked: false, image_url: IMG("Dumbbell_Lunges"), note: "per side" },
        { name: "DB Hip Thrust",             sets: 3, base_reps: 12, increment: 5,  start_weight: 35, tracked: false, image_url: IMG("Barbell_Hip_Thrust") },
        { name: "Leg Extensions",            sets: 3, base_reps: 15, increment: 10, start_weight: 40, tracked: false, image_url: IMG("Leg_Extensions"), progression_weeks: 2 },
        { name: "Lying Leg Curls",           sets: 3, base_reps: 12, increment: 10, start_weight: 40, tracked: false, image_url: IMG("Lying_Leg_Curls"), progression_weeks: 2 },
        { name: "Standing Calf Raises (DB)", sets: 3, base_reps: 15, increment: 5,  start_weight: 30, tracked: false, image_url: IMG("Standing_Calf_Raises") },
      ],
    },
  ],
};

const PRESET_TOTAL_FITNESS_5D: StarterProgram = {
  name: "5-Day Total Fitness",
  weeks: 8,
  deload_weeks: [4, 8],
  days: [
    {
      day_number: 1,
      label: "Day 1",
      title: "Upper A",
      exercises: [
        { name: "Barbell Bench Press",   sets: 4, base_reps: 10, increment: 10, start_weight: 50, tracked: true,  image_url: IMG("Barbell_Bench_Press_-_Medium_Grip"), peak_taper: true },
        { name: "Barbell Bent-Over Row", sets: 4, base_reps: 10, increment: 10, start_weight: 50, tracked: true,  image_url: IMG("Bent_Over_Barbell_Row"),             peak_taper: true },
        { name: "Seated DB Overhead Press", sets: 3, base_reps: 10, increment: 5, start_weight: 30, tracked: false, image_url: IMG("Seated_Dumbbell_Press") },
        { name: "Lat Pulldown",          sets: 3, base_reps: 12, increment: 10, start_weight: 50, tracked: false, image_url: IMG("Wide-Grip_Lat_Pulldown"), progression_weeks: 2 },
        { name: "EZ Bar Curl",           sets: 3, base_reps: 12, increment: 10, start_weight: 30, tracked: false, image_url: IMG("Close-Grip_EZ_Bar_Curl"), progression_weeks: 2 },
      ],
    },
    {
      day_number: 2,
      label: "Day 2",
      title: "Lower A",
      exercises: [
        { name: "Barbell Back Squat",        sets: 4, base_reps: 10, increment: 10, start_weight: 60, tracked: true,  image_url: IMG("Barbell_Squat"),     peak_taper: true },
        { name: "Romanian Deadlift",         sets: 3, base_reps: 10, increment: 10, start_weight: 60, tracked: true,  image_url: IMG("Romanian_Deadlift"), peak_taper: true },
        { name: "Leg Press",                 sets: 3, base_reps: 12, increment: 10, start_weight: 90, tracked: false, image_url: IMG("Leg_Press"), progression_weeks: 2 },
        { name: "Standing Calf Raises (DB)", sets: 4, base_reps: 15, increment: 5,  start_weight: 30, tracked: false, image_url: IMG("Standing_Calf_Raises") },
      ],
    },
    {
      day_number: 3,
      label: "Day 3",
      title: "Upper B",
      exercises: [
        { name: "Incline DB Press",       sets: 4, base_reps: 10, increment: 5,  start_weight: 25, tracked: false, image_url: IMG("Incline_Dumbbell_Press") },
        { name: "Seated Cable Rows",      sets: 4, base_reps: 12, increment: 10, start_weight: 50, tracked: false, image_url: IMG("Seated_Cable_Rows"), progression_weeks: 2 },
        { name: "Seated Side Lateral Raise", sets: 3, base_reps: 15, increment: 5, start_weight: 15, tracked: false, image_url: IMG("Seated_Side_Lateral_Raise") },
        { name: "Face Pulls",             sets: 3, base_reps: 15, increment: 10, start_weight: 20, tracked: false, image_url: IMG("Face_Pull"), progression_weeks: 2 },
        { name: "Tricep Pushdown",        sets: 3, base_reps: 12, increment: 10, start_weight: 30, tracked: false, image_url: IMG("Triceps_Pushdown"), progression_weeks: 2 },
      ],
    },
    {
      day_number: 4,
      label: "Day 4",
      title: "Lower B",
      exercises: [
        { name: "Bulgarian Split Squat", sets: 3, base_reps: 10,   increment: 10, start_weight: 20,   tracked: false, image_url: IMG("One_Leg_Barbell_Squat"), note: "per side, DB" },
        { name: "DB Hip Thrust",         sets: 3, base_reps: 12,   increment: 5,  start_weight: 35,   tracked: false, image_url: IMG("Barbell_Hip_Thrust") },
        { name: "Leg Extensions",        sets: 3, base_reps: 15,   increment: 10, start_weight: 40,   tracked: false, image_url: IMG("Leg_Extensions"), progression_weeks: 2 },
        { name: "Lying Leg Curls",       sets: 3, base_reps: 12,   increment: 10, start_weight: 40,   tracked: false, image_url: IMG("Lying_Leg_Curls"), progression_weeks: 2 },
        { name: "Plank",                 sets: 3, base_reps: null,  increment: 0,  start_weight: null, tracked: false, image_url: IMG("Plank"), kind: "time", target_seconds: 60 },
      ],
    },
    {
      day_number: 5,
      label: "Day 5",
      title: "Conditioning",
      exercises: [
        { name: "Goblet Squat",         sets: 3, base_reps: 15,   increment: 5, start_weight: 30,   tracked: false, image_url: IMG("Goblet_Squat") },
        { name: "DB Kettlebell Swings", sets: 4, base_reps: 15,   increment: 5, start_weight: 30,   tracked: false, image_url: IMG("One-Arm_Kettlebell_Swings") },
        { name: "Mountain Climbers",    sets: 3, base_reps: null,  increment: 0, start_weight: null, tracked: false, image_url: IMG("Mountain_Climbers"), kind: "time", target_seconds: 45 },
        { name: "Jump Rope",            sets: 3, base_reps: null,  increment: 0, start_weight: null, tracked: false, image_url: IMG("Rope_Jumping"), kind: "time", target_seconds: 120 },
        { name: "Russian Twist",        sets: 3, base_reps: 20,    increment: 0, start_weight: null, tracked: false, image_url: IMG("Russian_Twist") },
      ],
    },
  ],
};

const PRESET_LEAN_PPL_6D: StarterProgram = {
  name: "6-Day Lean PPL",
  weeks: 8,
  deload_weeks: [4, 8],
  days: [
    {
      day_number: 1,
      label: "Day 1",
      title: "Push A",
      exercises: [
        { name: "Barbell Bench Press",    sets: 4, base_reps: 10, increment: 10, start_weight: 50, tracked: true,  image_url: IMG("Barbell_Bench_Press_-_Medium_Grip"), peak_taper: true },
        { name: "Seated DB Overhead Press", sets: 3, base_reps: 12, increment: 5, start_weight: 30, tracked: false, image_url: IMG("Seated_Dumbbell_Press") },
        { name: "Incline DB Press",       sets: 3, base_reps: 12, increment: 5,  start_weight: 25, tracked: false, image_url: IMG("Incline_Dumbbell_Press") },
        { name: "Cable Fly",              sets: 3, base_reps: 15, increment: 10, start_weight: 20, tracked: false, image_url: IMG("Flat_Bench_Cable_Flyes"), progression_weeks: 2 },
        { name: "Tricep Pushdown",        sets: 3, base_reps: 15, increment: 10, start_weight: 30, tracked: false, image_url: IMG("Triceps_Pushdown"), progression_weeks: 2 },
      ],
    },
    {
      day_number: 2,
      label: "Day 2",
      title: "Pull A",
      exercises: [
        { name: "Barbell Bent-Over Row", sets: 4, base_reps: 10, increment: 10, start_weight: 50, tracked: true,  image_url: IMG("Bent_Over_Barbell_Row"), peak_taper: true },
        { name: "Lat Pulldown",          sets: 3, base_reps: 12, increment: 10, start_weight: 50, tracked: false, image_url: IMG("Wide-Grip_Lat_Pulldown"), progression_weeks: 2 },
        { name: "Seated Cable Rows",     sets: 3, base_reps: 12, increment: 10, start_weight: 50, tracked: false, image_url: IMG("Seated_Cable_Rows"), progression_weeks: 2 },
        { name: "Face Pulls",            sets: 3, base_reps: 15, increment: 10, start_weight: 20, tracked: false, image_url: IMG("Face_Pull"), progression_weeks: 2 },
        { name: "EZ Bar Curl",           sets: 3, base_reps: 12, increment: 10, start_weight: 30, tracked: false, image_url: IMG("Close-Grip_EZ_Bar_Curl"), progression_weeks: 2 },
      ],
    },
    {
      day_number: 3,
      label: "Day 3",
      title: "Legs A",
      exercises: [
        { name: "Barbell Back Squat",        sets: 4, base_reps: 10,   increment: 10, start_weight: 60,   tracked: true,  image_url: IMG("Barbell_Squat"),     peak_taper: true },
        { name: "Romanian Deadlift",         sets: 3, base_reps: 12,   increment: 10, start_weight: 60,   tracked: true,  image_url: IMG("Romanian_Deadlift"), peak_taper: true },
        { name: "Leg Press",                 sets: 3, base_reps: 15,   increment: 10, start_weight: 90,   tracked: false, image_url: IMG("Leg_Press"), progression_weeks: 2 },
        { name: "Standing Calf Raises (DB)", sets: 4, base_reps: 15,   increment: 5,  start_weight: 30,   tracked: false, image_url: IMG("Standing_Calf_Raises") },
        { name: "Jump Rope",                 sets: 3, base_reps: null,  increment: 0,  start_weight: null, tracked: false, image_url: IMG("Rope_Jumping"), kind: "time", target_seconds: 90 },
      ],
    },
    {
      day_number: 4,
      label: "Day 4",
      title: "Push B",
      exercises: [
        { name: "Incline DB Press",       sets: 4, base_reps: 12, increment: 5,  start_weight: 25, tracked: false, image_url: IMG("Incline_Dumbbell_Press") },
        { name: "Seated DB Overhead Press", sets: 3, base_reps: 12, increment: 5, start_weight: 25, tracked: false, image_url: IMG("Seated_Dumbbell_Press") },
        { name: "Cable Chest Press",      sets: 3, base_reps: 15, increment: 10, start_weight: 40, tracked: false, image_url: IMG("Cable_Chest_Press"), progression_weeks: 2 },
        { name: "Seated Side Lateral Raise", sets: 3, base_reps: 15, increment: 5, start_weight: 15, tracked: false, image_url: IMG("Seated_Side_Lateral_Raise") },
        { name: "EZ-Bar Skullcrusher",    sets: 3, base_reps: 12, increment: 10, start_weight: 30, tracked: false, image_url: IMG("EZ-Bar_Skullcrusher"), progression_weeks: 2 },
      ],
    },
    {
      day_number: 5,
      label: "Day 5",
      title: "Pull B",
      exercises: [
        { name: "Trap Bar Deadlift",    sets: 4, base_reps: 10,   increment: 10, start_weight: 70,   tracked: true,  image_url: IMG("Trap_Bar_Deadlift"), peak_taper: true },
        { name: "One-Arm Dumbbell Row", sets: 3, base_reps: 12,   increment: 5,  start_weight: 30,   tracked: false, image_url: IMG("One-Arm_Dumbbell_Row"), note: "per side" },
        { name: "Lat Pulldown",         sets: 3, base_reps: 12,   increment: 10, start_weight: 50,   tracked: false, image_url: IMG("Wide-Grip_Lat_Pulldown"), progression_weeks: 2 },
        { name: "Hammer Curl",          sets: 3, base_reps: 12,   increment: 5,  start_weight: 20,   tracked: false, image_url: IMG("Hammer_Curls") },
        { name: "Mountain Climbers",    sets: 3, base_reps: null,  increment: 0,  start_weight: null, tracked: false, image_url: IMG("Mountain_Climbers"), kind: "time", target_seconds: 45 },
      ],
    },
    {
      day_number: 6,
      label: "Day 6",
      title: "Legs B",
      exercises: [
        { name: "Bulgarian Split Squat", sets: 3, base_reps: 12,   increment: 10, start_weight: 20,   tracked: false, image_url: IMG("One_Leg_Barbell_Squat"), note: "per side, DB" },
        { name: "DB Hip Thrust",         sets: 3, base_reps: 15,   increment: 5,  start_weight: 35,   tracked: false, image_url: IMG("Barbell_Hip_Thrust") },
        { name: "Leg Extensions",        sets: 3, base_reps: 15,   increment: 10, start_weight: 40,   tracked: false, image_url: IMG("Leg_Extensions"), progression_weeks: 2 },
        { name: "Lying Leg Curls",       sets: 3, base_reps: 15,   increment: 10, start_weight: 40,   tracked: false, image_url: IMG("Lying_Leg_Curls"), progression_weeks: 2 },
        { name: "Jump Rope",             sets: 3, base_reps: null,  increment: 0,  start_weight: null, tracked: false, image_url: IMG("Rope_Jumping"), kind: "time", target_seconds: 120 },
      ],
    },
  ],
};

const PRESET_TOTAL_FITNESS_6D: StarterProgram = {
  name: "6-Day Total Fitness",
  weeks: 8,
  deload_weeks: [4, 8],
  days: [
    {
      day_number: 1,
      label: "Day 1",
      title: "Push A",
      exercises: [
        { name: "Barbell Bench Press",    sets: 4, base_reps: 10, increment: 10, start_weight: 50, tracked: true,  image_url: IMG("Barbell_Bench_Press_-_Medium_Grip"), peak_taper: true },
        { name: "Seated DB Overhead Press", sets: 3, base_reps: 10, increment: 5, start_weight: 30, tracked: false, image_url: IMG("Seated_Dumbbell_Press") },
        { name: "Incline DB Press",       sets: 3, base_reps: 10, increment: 5,  start_weight: 25, tracked: false, image_url: IMG("Incline_Dumbbell_Press") },
        { name: "Cable Fly",              sets: 3, base_reps: 12, increment: 10, start_weight: 20, tracked: false, image_url: IMG("Flat_Bench_Cable_Flyes"), progression_weeks: 2 },
        { name: "Tricep Pushdown",        sets: 3, base_reps: 12, increment: 10, start_weight: 30, tracked: false, image_url: IMG("Triceps_Pushdown"), progression_weeks: 2 },
      ],
    },
    {
      day_number: 2,
      label: "Day 2",
      title: "Pull A",
      exercises: [
        { name: "Barbell Bent-Over Row", sets: 4, base_reps: 10, increment: 10, start_weight: 50, tracked: true,  image_url: IMG("Bent_Over_Barbell_Row"), peak_taper: true },
        { name: "Lat Pulldown",          sets: 3, base_reps: 10, increment: 10, start_weight: 50, tracked: false, image_url: IMG("Wide-Grip_Lat_Pulldown"), progression_weeks: 2 },
        { name: "Seated Cable Rows",     sets: 3, base_reps: 12, increment: 10, start_weight: 50, tracked: false, image_url: IMG("Seated_Cable_Rows"), progression_weeks: 2 },
        { name: "Face Pulls",            sets: 3, base_reps: 15, increment: 10, start_weight: 20, tracked: false, image_url: IMG("Face_Pull"), progression_weeks: 2 },
        { name: "EZ Bar Curl",           sets: 3, base_reps: 12, increment: 10, start_weight: 30, tracked: false, image_url: IMG("Close-Grip_EZ_Bar_Curl"), progression_weeks: 2 },
      ],
    },
    {
      day_number: 3,
      label: "Day 3",
      title: "Legs A",
      exercises: [
        { name: "Barbell Back Squat",        sets: 4, base_reps: 10, increment: 10, start_weight: 60, tracked: true,  image_url: IMG("Barbell_Squat"),     peak_taper: true },
        { name: "Romanian Deadlift",         sets: 3, base_reps: 10, increment: 10, start_weight: 60, tracked: true,  image_url: IMG("Romanian_Deadlift"), peak_taper: true },
        { name: "Leg Press",                 sets: 3, base_reps: 12, increment: 10, start_weight: 90, tracked: false, image_url: IMG("Leg_Press"), progression_weeks: 2 },
        { name: "Standing Calf Raises (DB)", sets: 4, base_reps: 15, increment: 5,  start_weight: 30, tracked: false, image_url: IMG("Standing_Calf_Raises") },
      ],
    },
    {
      day_number: 4,
      label: "Day 4",
      title: "Push B",
      exercises: [
        { name: "Incline DB Press",       sets: 4, base_reps: 10, increment: 5,  start_weight: 25, tracked: false, image_url: IMG("Incline_Dumbbell_Press") },
        { name: "Seated DB Overhead Press", sets: 3, base_reps: 10, increment: 5, start_weight: 25, tracked: false, image_url: IMG("Seated_Dumbbell_Press") },
        { name: "Cable Chest Press",      sets: 3, base_reps: 12, increment: 10, start_weight: 40, tracked: false, image_url: IMG("Cable_Chest_Press"), progression_weeks: 2 },
        { name: "Seated Side Lateral Raise", sets: 3, base_reps: 15, increment: 5, start_weight: 15, tracked: false, image_url: IMG("Seated_Side_Lateral_Raise") },
        { name: "Overhead Tricep Extension", sets: 3, base_reps: 12, increment: 5, start_weight: 20, tracked: false, image_url: IMG("Seated_Triceps_Press") },
      ],
    },
    {
      day_number: 5,
      label: "Day 5",
      title: "Pull B",
      exercises: [
        { name: "Trap Bar Deadlift",    sets: 4, base_reps: 10, increment: 10, start_weight: 70, tracked: true,  image_url: IMG("Trap_Bar_Deadlift"), peak_taper: true },
        { name: "One-Arm Dumbbell Row", sets: 3, base_reps: 10, increment: 5,  start_weight: 30, tracked: false, image_url: IMG("One-Arm_Dumbbell_Row"), note: "per side" },
        { name: "Lat Pulldown",         sets: 3, base_reps: 12, increment: 10, start_weight: 50, tracked: false, image_url: IMG("Wide-Grip_Lat_Pulldown"), progression_weeks: 2 },
        { name: "Hammer Curl",          sets: 3, base_reps: 12, increment: 5,  start_weight: 20, tracked: false, image_url: IMG("Hammer_Curls") },
      ],
    },
    {
      day_number: 6,
      label: "Day 6",
      title: "Legs B",
      exercises: [
        { name: "Bulgarian Split Squat", sets: 3, base_reps: 10,   increment: 10, start_weight: 20,   tracked: false, image_url: IMG("One_Leg_Barbell_Squat"), note: "per side, DB" },
        { name: "DB Hip Thrust",         sets: 3, base_reps: 12,   increment: 5,  start_weight: 35,   tracked: false, image_url: IMG("Barbell_Hip_Thrust") },
        { name: "Leg Extensions",        sets: 3, base_reps: 15,   increment: 10, start_weight: 40,   tracked: false, image_url: IMG("Leg_Extensions"), progression_weeks: 2 },
        { name: "Lying Leg Curls",       sets: 3, base_reps: 12,   increment: 10, start_weight: 40,   tracked: false, image_url: IMG("Lying_Leg_Curls"), progression_weeks: 2 },
        { name: "Plank",                 sets: 3, base_reps: null,  increment: 0,  start_weight: null, tracked: false, image_url: IMG("Plank"), kind: "time", target_seconds: 60 },
      ],
    },
  ],
};

export const PRESET_PROGRAMS: PresetProgram[] = [
  {
    id: "starter-12wk",
    description: "Strength + hypertrophy split. 4 training days + rest. Deloads on weeks 4, 8, 12.",
    ...PRESET_STARTER_12WK,
  },
  {
    id: "ppl-6wk",
    description: "Classic push/pull/legs with a midweek rest. No deloads, light progression.",
    ...PRESET_PPL_6WK,
  },
  {
    id: "upper-lower-8wk",
    description: "Upper/lower split with a midweek rest. Deload on week 8.",
    ...PRESET_UPPER_LOWER_8WK,
  },
  {
    id: "full-body-3x-6wk",
    description: "Compound-focused full body, 3 training days + rest.",
    ...PRESET_FULL_BODY_3X_6WK,
  },
  {
    id: "full-body-2x",
    description: "Two full-body sessions a week — squat, press, row. Beginner-friendly, deloads on 4 & 8.",
    ...PRESET_FULL_BODY_2X,
  },
  {
    id: "upper-lower-2x",
    description: "Two days a week, one upper + one lower. A time-crunched build-muscle split.",
    ...PRESET_UPPER_LOWER_2X,
  },
  {
    id: "full-body-strength-2x",
    description: "Two heavy full-body days built on the big barbell lifts (5–6 reps). For experienced lifters short on days.",
    ...PRESET_FULL_BODY_STRENGTH_2X,
  },
  {
    id: "home-db-full-body",
    description: "Dumbbell-only full body, 3 days. No barbell or cables — built for a home rack.",
    ...PRESET_HOME_DB_FULL_BODY,
  },
  {
    id: "bodyweight-foundations",
    description: "No-equipment full body, 3 days. Push/lower/pull focus, progress by reps.",
    ...PRESET_BODYWEIGHT_FOUNDATIONS,
  },
  {
    id: "home-fat-loss-circuit",
    description: "Dumbbell + bodyweight circuits with cardio finishers, 3 days. Higher reps, short rests.",
    ...PRESET_HOME_FAT_LOSS_CIRCUIT,
  },
  {
    id: "lean-recomp-4d",
    description: "Upper/lower recomposition, 4 days. Heavy 8s + conditioning to lean out while holding strength.",
    ...PRESET_LEAN_RECOMP_4D,
  },
  {
    id: "push-pull-4d",
    description: "Push/pull split, 4 days. Two pushes, two pulls, heavy compounds up front.",
    ...PRESET_PUSH_PULL_4D,
  },
  {
    id: "ppl-5d",
    description: "Push/pull/legs plus an upper & lower day, 5 days. High-volume hypertrophy.",
    ...PRESET_PPL_5D,
  },
  {
    id: "lean-athlete-5d",
    description: "Athletic push/pull, 5 days, capped by a conditioning day. Strength with a lean-out bias.",
    ...PRESET_LEAN_ATHLETE_5D,
  },
  {
    id: "ppl-6d",
    description: "Six-day push/pull/legs run twice over. Maximum volume for advanced lifters.",
    ...PRESET_PPL_6D,
  },
  {
    id: "push-pull-6d",
    description: "Six-day push/pull with legs folded in. Three pushes, three pulls a week.",
    ...PRESET_PUSH_PULL_6D,
  },
  {
    id: "lean-circuit-2x",
    description: "Two full-body circuit days with cardio finishers. Higher reps for a lean-out on minimal days.",
    ...PRESET_LEAN_CIRCUIT_2X,
  },
  {
    id: "upper-lower-fitness-4d",
    description: "Balanced 4-day upper/lower for all-round fitness. Moderate reps, full-body coverage.",
    ...PRESET_UPPER_LOWER_FITNESS_4D,
  },
  {
    id: "total-fitness-5d",
    description: "Upper/lower over 5 days, capped with a conditioning day. Well-rounded strength + cardio.",
    ...PRESET_TOTAL_FITNESS_5D,
  },
  {
    id: "lean-ppl-6d",
    description: "Six-day push/pull/legs with cardio finishers and higher reps. High volume to lean out.",
    ...PRESET_LEAN_PPL_6D,
  },
  {
    id: "total-fitness-6d",
    description: "Six-day push/pull/legs at moderate volume. All-round fitness for advanced lifters.",
    ...PRESET_TOTAL_FITNESS_6D,
  },
];

export function getPreset(id: string): PresetProgram | undefined {
  return PRESET_PROGRAMS.find((p) => p.id === id);
}

// Backward compat for scripts/seed-program.ts
export const STARTER_PROGRAM: StarterProgram = PRESET_STARTER_12WK;
