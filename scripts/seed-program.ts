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
import { STARTER_PROGRAM } from "../src/lib/starter-program";

const PROGRAM = STARTER_PROGRAM;

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

  // If a program already exists, backfill mutable preset fields by exercise name and exit.
  const { data: existing } = await admin
    .from("programs")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);
  if (existing && existing.length > 0) {
    console.log("User already has a program — backfilling preset fields.");

    const allExercises = PROGRAM.days.flatMap((d) => d.exercises);
    const byName = new Map(
      allExercises.map((e) => [
        e.name,
        {
          image_url: e.image_url ?? null,
          start_weight: e.start_weight,
          increment: e.increment,
          progression_weeks: e.progression_weeks ?? 1,
        },
      ]),
    );

    const { data: rows, error: rowsErr } = await admin
      .from("program_exercises")
      .select(
        "id, name, image_url, start_weight, increment, progression_weeks, program_day_id, program_days!inner(program_id)",
      )
      .eq("program_days.program_id", existing[0].id);
    if (rowsErr) throw rowsErr;

    let updated = 0;
    for (const row of rows ?? []) {
      const target = byName.get(row.name);
      if (!target) continue;
      const patch: Record<string, unknown> = {};
      if (target.image_url && row.image_url !== target.image_url) patch.image_url = target.image_url;
      if (row.start_weight !== target.start_weight) patch.start_weight = target.start_weight;
      if (row.increment !== target.increment) patch.increment = target.increment;
      if (row.progression_weeks !== target.progression_weeks) patch.progression_weeks = target.progression_weeks;
      if (Object.keys(patch).length === 0) continue;
      const { error } = await admin
        .from("program_exercises")
        .update(patch)
        .eq("id", row.id);
      if (error) throw error;
      updated += 1;
    }
    console.log(`Updated ${updated} exercise rows.`);
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
      progression_weeks: ex.progression_weeks ?? 1,
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
