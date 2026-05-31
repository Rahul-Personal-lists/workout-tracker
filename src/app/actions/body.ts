"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";

const PHOTO_BUCKET = "workout-photos";

const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

const UpsertSchema = z
  .object({
    date: DateSchema,
    weightLb: z.number().positive().lt(2000).nullable(),
    calories: z.number().int().min(0).lt(100000).nullable(),
    bodyFatPct: z.number().positive().lt(100).nullable().optional(),
    note: z.string().max(500).nullable(),
  })
  // Weight is no longer required — body fat / calories can be logged for a date
  // on their own. But the row must carry at least one metric (mirrors the DB
  // CHECK body_logs_at_least_one_metric) so we never write an empty row.
  .refine(
    (v) => v.weightLb != null || v.calories != null || v.bodyFatPct != null,
    { message: "Log at least one of weight, body fat, or calories" }
  );

export async function upsertBodyLog(input: z.infer<typeof UpsertSchema>) {
  const parsed = UpsertSchema.parse(input);
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("body_logs").upsert(
    {
      user_id: user.id,
      log_date: parsed.date,
      weight_lb: parsed.weightLb,
      calories: parsed.calories,
      body_fat_pct: parsed.bodyFatPct ?? null,
      note: parsed.note,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,log_date" }
  );
  if (error) throw error;

  revalidatePath("/body");
}

const DeleteSchema = z.object({ date: DateSchema });

async function deleteBodyLogRow(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string,
  date: string
) {
  const { data: photos, error: photoErr } = await supabase
    .from("body_log_photos")
    .select("storage_path")
    .eq("user_id", userId)
    .eq("log_date", date);
  if (photoErr) throw photoErr;

  if (photos && photos.length > 0) {
    await supabase.storage
      .from(PHOTO_BUCKET)
      .remove(photos.map((p) => p.storage_path));
  }

  const { error } = await supabase
    .from("body_logs")
    .delete()
    .eq("user_id", userId)
    .eq("log_date", date);
  if (error) throw error;
}

export async function deleteBodyLog(input: z.infer<typeof DeleteSchema>) {
  const { date } = DeleteSchema.parse(input);
  const { supabase, user } = await requireUser();
  await deleteBodyLogRow(supabase, user.id, date);
  revalidatePath("/body");
}

const DeleteBodyLogMetricSchema = z.object({
  date: DateSchema,
  metric: z.enum(["weight", "bodyfat", "calories"]),
});

const METRIC_COL: Record<
  z.infer<typeof DeleteBodyLogMetricSchema>["metric"],
  "weight_lb" | "body_fat_pct" | "calories"
> = {
  weight: "weight_lb",
  bodyfat: "body_fat_pct",
  calories: "calories",
};

export async function deleteBodyLogMetric(
  input: z.infer<typeof DeleteBodyLogMetricSchema>
) {
  const { date, metric } = DeleteBodyLogMetricSchema.parse(input);
  const { supabase, user } = await requireUser();

  const { data: row, error: fetchErr } = await supabase
    .from("body_logs")
    .select("weight_lb, body_fat_pct, calories")
    .eq("user_id", user.id)
    .eq("log_date", date)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!row) return;

  const col = METRIC_COL[metric];
  // After clearing `col`, would all three metrics be null? If so we have to
  // delete the row entirely — the body_logs_at_least_one_metric CHECK rejects
  // an all-null row.
  const remainingCount =
    (col !== "weight_lb" && row.weight_lb !== null ? 1 : 0) +
    (col !== "body_fat_pct" && row.body_fat_pct !== null ? 1 : 0) +
    (col !== "calories" && row.calories !== null ? 1 : 0);

  if (remainingCount === 0) {
    await deleteBodyLogRow(supabase, user.id, date);
  } else {
    const now = new Date().toISOString();
    // Supabase's update type is column-tight — pick the literal column at the
    // call site so the dynamic dispatch doesn't widen to a broad index sig.
    const update =
      col === "weight_lb"
        ? { weight_lb: null, updated_at: now }
        : col === "body_fat_pct"
          ? { body_fat_pct: null, updated_at: now }
          : { calories: null, updated_at: now };
    const { error } = await supabase
      .from("body_logs")
      .update(update)
      .eq("user_id", user.id)
      .eq("log_date", date);
    if (error) throw error;
  }

  revalidatePath("/body");
}

const MeasurementSchema = z.object({
  date: DateSchema,
  metric: z.enum(["chest", "waist", "hips", "bicep", "thigh"]),
  valueCm: z.number().positive().lt(500),
});

export async function upsertBodyMeasurement(
  input: z.infer<typeof MeasurementSchema>
) {
  const parsed = MeasurementSchema.parse(input);
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("body_measurements").upsert(
    {
      user_id: user.id,
      log_date: parsed.date,
      metric: parsed.metric,
      value_cm: parsed.valueCm,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,log_date,metric" }
  );
  if (error) throw error;

  revalidatePath("/body");
}

const DeleteMeasurementSchema = z.object({
  date: DateSchema,
  metric: z.enum(["chest", "waist", "hips", "bicep", "thigh"]),
});

export async function deleteBodyMeasurement(
  input: z.infer<typeof DeleteMeasurementSchema>
) {
  const { date, metric } = DeleteMeasurementSchema.parse(input);
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("body_measurements")
    .delete()
    .eq("user_id", user.id)
    .eq("log_date", date)
    .eq("metric", metric);
  if (error) throw error;

  revalidatePath("/body");
}

const GoalSchema = z.object({
  goalWeightLb: z.number().positive().lt(2000).nullable(),
});

export async function setGoalWeight(input: z.infer<typeof GoalSchema>) {
  const { goalWeightLb } = GoalSchema.parse(input);
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("profiles").upsert({
    user_id: user.id,
    goal_weight_lb: goalWeightLb,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;

  revalidatePath("/body");
  revalidatePath("/settings");
}

const RecordPhotosSchema = z.object({
  logDate: DateSchema,
  paths: z.array(z.string().min(1)).min(1).max(3),
});

export async function recordBodyPhotos(input: z.infer<typeof RecordPhotosSchema>) {
  const { logDate, paths } = RecordPhotosSchema.parse(input);
  const { supabase, user } = await requireUser();

  const expectedPrefix = `${user.id}/body/${logDate}/`;
  for (const p of paths) {
    if (!p.startsWith(expectedPrefix)) {
      throw new Error("Invalid photo path");
    }
  }

  const { data: log, error: logErr } = await supabase
    .from("body_logs")
    .select("log_date")
    .eq("user_id", user.id)
    .eq("log_date", logDate)
    .maybeSingle();
  if (logErr) throw logErr;
  if (!log) throw new Error("Log an entry for this date first");

  const { error: insErr } = await supabase.from("body_log_photos").insert(
    paths.map((p) => ({
      user_id: user.id,
      log_date: logDate,
      storage_path: p,
    }))
  );
  if (insErr) {
    await supabase.storage.from(PHOTO_BUCKET).remove(paths);
    throw insErr;
  }

  revalidatePath("/body");
  return { recorded: paths.length };
}

const DeletePhotoSchema = z.object({
  photoId: z.string().uuid(),
});

export async function deleteBodyPhoto(input: z.infer<typeof DeletePhotoSchema>) {
  const { photoId } = DeletePhotoSchema.parse(input);
  const { supabase, user } = await requireUser();

  const { data: photo, error: fetchErr } = await supabase
    .from("body_log_photos")
    .select("id, storage_path")
    .eq("id", photoId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!photo) return;

  await supabase.storage.from(PHOTO_BUCKET).remove([photo.storage_path]);

  const { error: delErr } = await supabase
    .from("body_log_photos")
    .delete()
    .eq("id", photoId);
  if (delErr) throw delErr;

  revalidatePath("/body");
}
