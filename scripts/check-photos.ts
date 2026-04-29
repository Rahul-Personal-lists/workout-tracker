/**
 * Diagnostic: list workout_session_photos rows + storage objects for a user.
 *
 *   npx tsx scripts/check-photos.ts <user-email>
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  try {
    const raw = readFileSync(envPath, "utf-8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !serviceKey) throw new Error("Missing env");

  const email = process.argv[2];
  if (!email) throw new Error("Usage: npx tsx scripts/check-photos.ts <email>");

  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: usersList } = await sb.auth.admin.listUsers();
  const user = usersList?.users.find((u) => u.email === email);
  if (!user) throw new Error(`No user with email ${email}`);
  console.log(`User: ${user.email}  id: ${user.id}`);

  const { data: sessions, error: sErr } = await sb
    .from("workout_sessions")
    .select("id, started_at, ended_at, notes")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(10);
  if (sErr) throw sErr;
  console.log(`\nLast ${sessions?.length ?? 0} sessions:`);
  for (const s of sessions ?? []) {
    console.log(`  ${s.id}  start=${s.started_at}  end=${s.ended_at ?? "—"}`);
  }

  const { data: photos, error: pErr } = await sb
    .from("workout_session_photos")
    .select("id, session_id, storage_path, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (pErr) throw pErr;
  console.log(`\nworkout_session_photos rows: ${photos?.length ?? 0}`);
  for (const p of photos ?? []) {
    console.log(`  ${p.created_at}  session=${p.session_id}  path=${p.storage_path}`);
  }

  const { data: objects, error: oErr } = await sb.storage
    .from("workout-photos")
    .list(user.id, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
  if (oErr) console.log(`storage list error: ${oErr.message}`);
  else console.log(`\nStorage objects under ${user.id}/ : ${objects?.length ?? 0}`);
  for (const o of objects ?? []) {
    console.log(`  ${o.created_at}  ${o.name}  ${o.metadata?.size ?? "?"} bytes`);
  }

  for (const s of sessions ?? []) {
    const { data: nested } = await sb.storage
      .from("workout-photos")
      .list(`${user.id}/${s.id}`, { limit: 100 });
    if (nested && nested.length > 0) {
      console.log(`\nStorage in ${user.id}/${s.id}/ :`);
      for (const o of nested) {
        console.log(`    ${o.created_at}  ${o.name}  ${o.metadata?.size ?? "?"} bytes  ${o.metadata?.mimetype ?? ""}`);
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
