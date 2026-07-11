// Post-deploy verification for the delete-account edge function. Creates a
// throwaway user, seeds rows + storage objects, invokes the deployed function
// with the user's own JWT, then asserts auth user, rows, and storage are gone.
// NEVER touches real accounts; cleans up its throwaway on any failure.
//
// Run: npx tsx scripts/verify-delete-account.ts
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

type Check = { check: string; pass: boolean; detail: string };

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createClient(url, service, { auth: { persistSession: false } });

  const email = `claude-test-delete-${Date.now()}@example.com`;
  const password = randomUUID();
  const checks: Check[] = [];
  let uid: string | null = null;
  let deletedByFunction = false;

  try {
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (cErr || !created.user) throw cErr ?? new Error("createUser returned no user");
    uid = created.user.id;

    const anonClient = createClient(url, anon, { auth: { persistSession: false } });
    const { data: signin, error: sErr } = await anonClient.auth.signInWithPassword({
      email,
      password,
    });
    if (sErr || !signin.session) throw sErr ?? new Error("signInWithPassword: no session");
    const jwt = signin.session.access_token;

    // Seed AS THE USER (RLS-scoped) so the fixture matches real data shapes.
    const authed = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false },
    });
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();

    const seeds: [string, { error: { message: string } | null }][] = [
      [
        "seed body_logs",
        await authed.from("body_logs").insert({ user_id: uid, log_date: today, weight_lb: 180, updated_at: now }),
      ],
      [
        "seed body_measurements",
        await authed
          .from("body_measurements")
          .insert({ user_id: uid, log_date: today, metric: "chest", value_cm: 100, updated_at: now }),
      ],
      [
        "seed profiles",
        await authed.from("profiles").upsert({ user_id: uid, display_name: "Delete Me", updated_at: now }),
      ],
    ];
    for (const [label, r] of seeds) if (r.error) throw new Error(`${label}: ${r.error.message}`);

    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64"
    );
    const up1 = await authed.storage
      .from("workout-photos")
      .upload(`${uid}/body/${today}/a.png`, png, { contentType: "image/png" });
    if (up1.error) throw new Error(`upload body photo: ${up1.error.message}`);
    const up2 = await authed.storage
      .from("workout-photos")
      .upload(`${uid}/profile/b.png`, png, { contentType: "image/png" });
    if (up2.error) throw new Error(`upload avatar: ${up2.error.message}`);
    const ph = await authed
      .from("body_log_photos")
      .insert({ user_id: uid, log_date: today, storage_path: `${uid}/body/${today}/a.png` });
    if (ph.error) throw new Error(`seed body_log_photos: ${ph.error.message}`);

    // Invoke the DEPLOYED function with the user's own JWT.
    const res = await fetch(`${url}/functions/v1/delete-account`, {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}`, apikey: anon },
    });
    const body = (await res.json().catch(() => ({}))) as {
      deleted?: boolean;
      storageObjectsRemoved?: number;
      error?: string;
    };
    deletedByFunction = res.status === 200 && body.deleted === true;
    checks.push({
      check: "function 200 + deleted:true",
      pass: deletedByFunction,
      detail: `status=${res.status} body=${JSON.stringify(body)}`,
    });
    checks.push({
      check: "storage objects removed = 2",
      pass: body.storageObjectsRemoved === 2,
      detail: `storageObjectsRemoved=${body.storageObjectsRemoved}`,
    });

    const { data: gone, error: gErr } = await admin.auth.admin.getUserById(uid);
    checks.push({
      check: "auth user gone",
      pass: !!gErr || !gone?.user,
      detail: gErr?.message ?? (gone?.user ? "USER STILL EXISTS" : "not found"),
    });

    for (const table of ["body_logs", "body_measurements", "body_log_photos", "profiles"] as const) {
      const { count, error } = await admin
        .from(table)
        .select("*", { count: "exact", head: true })
        .eq("user_id", uid);
      checks.push({
        check: `${table} rows = 0`,
        pass: !error && (count ?? 0) === 0,
        detail: error?.message ?? `count=${count ?? 0}`,
      });
    }

    for (const prefix of [uid, `${uid}/body/${today}`, `${uid}/profile`]) {
      const { data: entries, error } = await admin.storage
        .from("workout-photos")
        .list(prefix, { limit: 10 });
      checks.push({
        check: `storage ${prefix === uid ? "{uid}" : prefix.replace(uid, "{uid}")} empty`,
        pass: !error && (entries ?? []).length === 0,
        detail: error?.message ?? `entries=${entries?.length ?? 0}`,
      });
    }
  } finally {
    // Never leave a throwaway user behind if anything failed pre-deletion.
    if (uid && !deletedByFunction) {
      await admin.auth.admin.deleteUser(uid).catch(() => {});
    }
  }

  console.table(checks);
  if (checks.some((c) => !c.pass)) {
    console.error("delete-account verification FAILED");
    process.exit(1);
  }
  console.log(`delete-account verified (throwaway: ${email})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
