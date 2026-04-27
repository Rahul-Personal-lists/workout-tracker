"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

const UpsertSchema = z.object({
  date: DateSchema,
  weightLb: z.number().positive().lt(2000),
  calories: z.number().int().min(0).lt(100000).nullable(),
  note: z.string().max(500).nullable(),
});

export async function upsertBodyLog(input: z.infer<typeof UpsertSchema>) {
  const parsed = UpsertSchema.parse(input);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("body_logs").upsert(
    {
      user_id: user.id,
      log_date: parsed.date,
      weight_lb: parsed.weightLb,
      calories: parsed.calories,
      note: parsed.note,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,log_date" }
  );
  if (error) throw error;

  revalidatePath("/body");
}

const DeleteSchema = z.object({ date: DateSchema });

export async function deleteBodyLog(input: z.infer<typeof DeleteSchema>) {
  const { date } = DeleteSchema.parse(input);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("body_logs")
    .delete()
    .eq("user_id", user.id)
    .eq("log_date", date);
  if (error) throw error;

  revalidatePath("/body");
}
