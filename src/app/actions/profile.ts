"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const SetDisplayNameSchema = z.object({
  name: z.string().trim().min(1).max(40),
});

export async function setDisplayName(
  input: z.infer<typeof SetDisplayNameSchema>
) {
  const { name } = SetDisplayNameSchema.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("profiles")
    .upsert({
      user_id: user.id,
      display_name: name,
      updated_at: new Date().toISOString(),
    });
  if (error) throw error;

  revalidatePath("/today");
  revalidatePath("/settings");
}
