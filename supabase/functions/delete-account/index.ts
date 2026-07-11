// Supabase Edge Function: delete the CALLING user's account.
// The uid is derived from the request JWT only — there is no way to target
// another user. Storage objects under workout-photos/{uid}/** are removed
// first (FKs cascade DB rows on auth-user deletion; storage doesn't cascade),
// then the auth user is deleted with the service role.
//
// Deploy (Rahul's step): supabase functions deploy delete-account
// Post-deploy check:     npx tsx scripts/verify-delete-account.ts
import { createClient } from "npm:@supabase/supabase-js@2";

const BUCKET = "workout-photos";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  const caller = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const {
    data: { user },
    error: userErr,
  } = await caller.auth.getUser();
  if (userErr || !user) return json(401, { error: "Unauthorized" });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Iterative walk of {uid}/**: folders come back with id === null, files with
  // ids (same convention the web deleteAccount action relies on). Unlike that
  // action's 3-level unroll, this walks to any depth and pages each folder
  // (limit 1000 + offset) until a short page — the public delete-account page
  // promises every photo goes.
  let removed = 0;
  try {
    const folders: string[] = [user.id];
    const files: string[] = [];
    while (folders.length > 0) {
      const prefix = folders.pop()!;
      let offset = 0;
      for (;;) {
        const { data: entries, error: listErr } = await admin.storage
          .from(BUCKET)
          .list(prefix, { limit: 1000, offset });
        if (listErr) throw listErr;
        for (const e of entries ?? []) {
          if (e.id) files.push(`${prefix}/${e.name}`);
          else folders.push(`${prefix}/${e.name}`);
        }
        if (!entries || entries.length < 1000) break;
        offset += 1000;
      }
    }
    for (let i = 0; i < files.length; i += 500) {
      const chunk = files.slice(i, i + 500);
      const { error: rmErr } = await admin.storage.from(BUCKET).remove(chunk);
      if (rmErr) throw rmErr;
      removed += chunk.length;
    }
  } catch (err) {
    // Best-effort like the web action: log, then still delete the account —
    // the published promise is account deletion; orphaned objects are the
    // lesser failure and are logged for a manual sweep.
    console.error("storage cleanup failed", err);
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) return json(500, { error: delErr.message });

  return json(200, { deleted: true, storageObjectsRemoved: removed });
});
