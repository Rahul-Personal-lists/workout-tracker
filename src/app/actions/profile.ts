"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { PHOTO_BUCKET } from "@/lib/photo-upload";

const ProfileFieldsSchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  gender: z.enum(["male", "female", "other"]).nullable().optional(),
  age: z.number().int().positive().lt(150).nullable().optional(),
  heightCm: z.number().positive().lt(300).nullable().optional(),
});

export async function setProfileFields(input: z.infer<typeof ProfileFieldsSchema>) {
  const parsed = ProfileFieldsSchema.parse(input);
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("profiles").upsert({
    user_id: user.id,
    updated_at: new Date().toISOString(),
    ...(parsed.name !== undefined ? { display_name: parsed.name } : {}),
    ...(parsed.gender !== undefined ? { gender: parsed.gender } : {}),
    ...(parsed.age !== undefined ? { age: parsed.age } : {}),
    ...(parsed.heightCm !== undefined ? { height_cm: parsed.heightCm } : {}),
  });
  if (error) throw error;

  revalidatePath("/settings");
  revalidatePath("/settings/profile");
}

const AvatarSchema = z.object({
  path: z.string().min(1),
});

export async function setAvatar(input: z.infer<typeof AvatarSchema>) {
  const { path } = AvatarSchema.parse(input);
  const { supabase, user } = await requireUser();

  const expectedPrefix = `${user.id}/profile/`;
  if (!path.startsWith(expectedPrefix)) {
    throw new Error("Invalid avatar path");
  }

  const { data: existing, error: readErr } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("user_id", user.id)
    .maybeSingle();
  if (readErr) throw readErr;

  if (existing?.avatar_path && existing.avatar_path !== path) {
    await supabase.storage.from(PHOTO_BUCKET).remove([existing.avatar_path]);
  }

  const { error: upErr } = await supabase.from("profiles").upsert({
    user_id: user.id,
    avatar_path: path,
    updated_at: new Date().toISOString(),
  });
  if (upErr) throw upErr;

  revalidatePath("/settings");
  revalidatePath("/settings/profile");
}

export async function clearAvatar() {
  const { supabase, user } = await requireUser();

  const { data: existing, error: readErr } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("user_id", user.id)
    .maybeSingle();
  if (readErr) throw readErr;

  if (existing?.avatar_path) {
    await supabase.storage.from(PHOTO_BUCKET).remove([existing.avatar_path]);
  }

  const { error } = await supabase
    .from("profiles")
    .upsert({
      user_id: user.id,
      avatar_path: null,
      updated_at: new Date().toISOString(),
    });
  if (error) throw error;

  revalidatePath("/settings");
  revalidatePath("/settings/profile");
}

const UnitsSchema = z.object({
  units: z.enum(["imperial", "metric"]),
});

export async function setUnits(input: z.infer<typeof UnitsSchema>) {
  const { units } = UnitsSchema.parse(input);
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("profiles").upsert({
    user_id: user.id,
    units,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;

  const cookieStore = await cookies();
  cookieStore.set("units", units, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
}

const SoundPrefsSchema = z.object({
  soundLeadSeconds: z.union([z.literal(0), z.literal(5), z.null()]),
  vibrationLeadSeconds: z.union([z.literal(0), z.literal(5), z.null()]),
});

export async function setSoundPrefs(input: z.infer<typeof SoundPrefsSchema>) {
  const { soundLeadSeconds, vibrationLeadSeconds } =
    SoundPrefsSchema.parse(input);
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("profiles").upsert({
    user_id: user.id,
    sound_lead_seconds: soundLeadSeconds,
    vibration_lead_seconds: vibrationLeadSeconds,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;

  const cookieStore = await cookies();
  const value = `${soundLeadSeconds ?? "off"}|${vibrationLeadSeconds ?? "off"}`;
  cookieStore.set("sound-prefs", value, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  revalidatePath("/settings");
  revalidatePath("/settings/sounds");
}

export async function deleteAccount() {
  const { supabase, user } = await requireUser();

  // Best-effort cleanup of storage objects under this user's prefix.
  // FKs cascade the DB rows; storage objects don't.
  const { data: objects } = await supabase.storage
    .from(PHOTO_BUCKET)
    .list(user.id, { limit: 1000 });
  if (objects && objects.length > 0) {
    const paths: string[] = [];
    for (const obj of objects) {
      // The `list` returns the immediate children; subfolders have no `id`.
      // Recursively list each subfolder.
      if (obj.id) {
        paths.push(`${user.id}/${obj.name}`);
      } else {
        const { data: nested } = await supabase.storage
          .from(PHOTO_BUCKET)
          .list(`${user.id}/${obj.name}`, { limit: 1000 });
        for (const n of nested ?? []) {
          if (n.id) {
            paths.push(`${user.id}/${obj.name}/${n.name}`);
          } else {
            const { data: deeper } = await supabase.storage
              .from(PHOTO_BUCKET)
              .list(`${user.id}/${obj.name}/${n.name}`, { limit: 1000 });
            for (const d of deeper ?? []) {
              if (d.id) {
                paths.push(`${user.id}/${obj.name}/${n.name}/${d.name}`);
              }
            }
          }
        }
      }
    }
    if (paths.length > 0) {
      await supabase.storage.from(PHOTO_BUCKET).remove(paths);
    }
  }

  // Auth admin delete cascades all owned rows via on-delete-cascade FKs.
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) throw delErr;

  // Sign out the now-orphaned session so subsequent requests hit /login.
  await supabase.auth.signOut();

  redirect("/login");
}
