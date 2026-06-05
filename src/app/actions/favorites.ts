"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";

const ToggleSchema = z.object({ slug: z.string().min(1).max(200) });

// Idempotent toggle — one action covers add + remove. Returns the resulting
// state so the client can reconcile its optimistic update.
export async function toggleFavorite(
  input: z.infer<typeof ToggleSchema>
): Promise<{ favorited: boolean }> {
  const { slug } = ToggleSchema.parse(input);
  const { supabase, user } = await requireUser();

  const { data: existing, error: selErr } = await supabase
    .from("exercise_favorites")
    .select("exercise_slug")
    .eq("user_id", user.id)
    .eq("exercise_slug", slug)
    .maybeSingle();
  if (selErr) throw selErr;

  if (existing) {
    const { error } = await supabase
      .from("exercise_favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("exercise_slug", slug);
    if (error) throw error;
    revalidatePath("/program/exercises");
    return { favorited: false };
  }

  const { error } = await supabase
    .from("exercise_favorites")
    .insert({ user_id: user.id, exercise_slug: slug });
  if (error) throw error;
  revalidatePath("/program/exercises");
  return { favorited: true };
}
