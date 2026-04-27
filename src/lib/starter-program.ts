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

export const STARTER_PROGRAM: StarterProgram = {
  name: "12-Week Hypertrophy",
  weeks: 12,
  deload_weeks: [4, 8, 12],
  days: [
    {
      day_number: 1,
      label: "Day 1",
      title: "Upper — Strength",
      exercises: [
        { name: "Barbell Bench Press",      sets: 4, base_reps: 5,  increment: 5,   start_weight: 65,   tracked: true,  image_url: IMG("Barbell_Bench_Press_-_Medium_Grip") },
        { name: "Barbell Bent-Over Row",    sets: 4, base_reps: 5,  increment: 5,   start_weight: 60,   tracked: true,  image_url: IMG("Bent_Over_Barbell_Row") },
        { name: "Seated DB Overhead Press", sets: 3, base_reps: 8,  increment: 2.5, start_weight: 45,   tracked: true,  image_url: IMG("Seated_Dumbbell_Press") },
        { name: "Cable Row (close grip)",   sets: 3, base_reps: 10, increment: 5,   start_weight: 50,   tracked: false, image_url: IMG("Seated_Cable_Rows") },
        { name: "EZ Bar Curl",              sets: 3, base_reps: 10, increment: 2.5, start_weight: 30,   tracked: false, image_url: IMG("Close-Grip_EZ_Bar_Curl") },
        { name: "Tricep Pushdown",          sets: 3, base_reps: 10, increment: 2.5, start_weight: 30,   tracked: false, image_url: IMG("Triceps_Pushdown") },
      ],
    },
    {
      day_number: 2,
      label: "Day 2",
      title: "Lower — Strength",
      exercises: [
        { name: "Barbell Back Squat",        sets: 4, base_reps: 5,  increment: 5,   start_weight: 65,   tracked: true,  image_url: IMG("Barbell_Squat") },
        { name: "Romanian Deadlift",         sets: 3, base_reps: 8,  increment: 5,   start_weight: 75,   tracked: true,  image_url: IMG("Romanian_Deadlift") },
        { name: "DB Reverse Lunge",          sets: 3, base_reps: 10, increment: 2.5, start_weight: 20,   tracked: false, image_url: IMG("Dumbbell_Rear_Lunge"),                         note: "per side" },
        { name: "DB Hip Thrust",             sets: 3, base_reps: 12, increment: 5,   start_weight: 35,   tracked: false, image_url: IMG("Barbell_Hip_Thrust") },
        { name: "Standing Calf Raises (DB)", sets: 4, base_reps: 15, increment: 5,   start_weight: 30,   tracked: false, image_url: IMG("Standing_Calf_Raises") },
        { name: "Plank",                     sets: 3, base_reps: null, increment: 0, start_weight: null, tracked: false, image_url: IMG("Plank"),                                       note: "45 sec hold" },
      ],
    },
    {
      day_number: 3,
      label: "Day 3",
      title: "Upper — Hypertrophy",
      exercises: [
        { name: "Incline DB Press",          sets: 4, base_reps: 10, increment: 2.5, start_weight: 25, tracked: false, image_url: IMG("Incline_Dumbbell_Press") },
        { name: "Lat Pulldown",              sets: 4, base_reps: 10, increment: 5,   start_weight: 50, tracked: false, image_url: IMG("Wide-Grip_Lat_Pulldown") },
        { name: "Cable Fly",                 sets: 3, base_reps: 12, increment: 2.5, start_weight: 15, tracked: false, image_url: IMG("Flat_Bench_Cable_Flyes") },
        { name: "Face Pulls",                sets: 3, base_reps: 15, increment: 2.5, start_weight: 20, tracked: false, image_url: IMG("Face_Pull") },
        { name: "Hammer Curl",               sets: 3, base_reps: 12, increment: 2.5, start_weight: 20, tracked: false, image_url: IMG("Hammer_Curls") },
        { name: "Overhead Tricep Extension", sets: 3, base_reps: 12, increment: 2.5, start_weight: 25, tracked: false, image_url: IMG("Seated_Triceps_Press") },
      ],
    },
    {
      day_number: 4,
      label: "Day 4",
      title: "Lower — Hypertrophy",
      exercises: [
        { name: "DB Good Morning",            sets: 3, base_reps: 12, increment: 2.5, start_weight: 20,   tracked: false, image_url: IMG("Good_Morning") },
        { name: "Bulgarian Split Squat",      sets: 3, base_reps: 10, increment: 2.5, start_weight: 20,   tracked: false, image_url: IMG("One_Leg_Barbell_Squat"),                       note: "per side, DB" },
        { name: "DB Lunges",                  sets: 3, base_reps: 12, increment: 2.5, start_weight: 20,   tracked: false, image_url: IMG("Dumbbell_Lunges"),                            note: "per side" },
        { name: "DB Stiff-Leg Deadlift",      sets: 3, base_reps: 12, increment: 5,   start_weight: 35,   tracked: false, image_url: IMG("Stiff-Legged_Dumbbell_Deadlift") },
        { name: "DB Hip Thrust",              sets: 3, base_reps: 12, increment: 5,   start_weight: 35,   tracked: false, image_url: IMG("Barbell_Hip_Thrust") },
        { name: "Ab Wheel / Plank Variation", sets: 3, base_reps: 15, increment: 0,   start_weight: null, tracked: false, image_url: IMG("Ab_Roller") },
      ],
    },
  ],
};
