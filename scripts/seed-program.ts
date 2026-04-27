/**
 * Seed the 12-week program for a given user.
 *
 *   npx tsx scripts/seed-program.ts <user-email>
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in .env.local.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Reference images come from yuhonas/free-exercise-db (public domain).
// Stored as frame-0 URL; UI swaps to /1.jpg for the second frame.
const IMG = (slug: string) =>
  `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${slug}/0.jpg`;

type SeedExercise = {
  name: string;
  sets: number;
  base_reps: number | null;
  increment: number;
  start_weight: number | null;
  tracked: boolean;
  image_url: string | null;
  note?: string;
};

type SeedDay = {
  day_number: number;
  label: string;
  title: string;
  exercises: SeedExercise[];
};

type SeedProgram = {
  name: string;
  weeks: number;
  deload_weeks: number[];
  days: SeedDay[];
};

const PROGRAM: SeedProgram = {
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

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  try {
    const raw = readFileSync(envPath, "utf-8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // No .env.local — fall back to process env.
  }
}

async function main() {
  loadEnv();
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx scripts/seed-program.ts <user-email>");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Find or create user.
  const { data: list, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) throw listErr;
  let user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (!user) {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    if (createErr) throw createErr;
    user = created.user!;
    console.log(`Created user ${email} (${user.id}).`);
  } else {
    console.log(`Found user ${email} (${user.id}).`);
  }

  // If a program already exists, backfill image_url by exercise name and exit.
  const { data: existing } = await admin
    .from("programs")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);
  if (existing && existing.length > 0) {
    console.log("User already has a program — backfilling image URLs.");

    const allExercises = PROGRAM.days.flatMap((d) => d.exercises);
    const byName = new Map(allExercises.map((e) => [e.name, e.image_url ?? null]));

    const { data: rows, error: rowsErr } = await admin
      .from("program_exercises")
      .select("id, name, image_url, program_day_id, program_days!inner(program_id)")
      .eq("program_days.program_id", existing[0].id);
    if (rowsErr) throw rowsErr;

    let updated = 0;
    for (const row of rows ?? []) {
      const url = byName.get(row.name);
      if (url && row.image_url !== url) {
        const { error } = await admin
          .from("program_exercises")
          .update({ image_url: url })
          .eq("id", row.id);
        if (error) throw error;
        updated += 1;
      }
    }
    console.log(`Updated ${updated} exercise image URLs.`);
    return;
  }

  // Insert program.
  const { data: programRow, error: progErr } = await admin
    .from("programs")
    .insert({
      user_id: user.id,
      name: PROGRAM.name,
      weeks: PROGRAM.weeks,
      deload_weeks: PROGRAM.deload_weeks,
    })
    .select()
    .single();
  if (progErr) throw progErr;

  for (const day of PROGRAM.days) {
    const { data: dayRow, error: dayErr } = await admin
      .from("program_days")
      .insert({
        program_id: programRow.id,
        day_number: day.day_number,
        label: day.label,
        title: day.title,
      })
      .select()
      .single();
    if (dayErr) throw dayErr;

    const exerciseRows = day.exercises.map((ex, i) => ({
      program_day_id: dayRow.id,
      order_index: i,
      name: ex.name,
      sets: ex.sets,
      base_reps: ex.base_reps,
      start_weight: ex.start_weight,
      increment: ex.increment,
      tracked: ex.tracked,
      note: "note" in ex ? ex.note : null,
      image_url: ex.image_url ?? null,
    }));

    const { error: exErr } = await admin.from("program_exercises").insert(exerciseRows);
    if (exErr) throw exErr;
  }

  console.log(`Seeded "${PROGRAM.name}" for ${email}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
