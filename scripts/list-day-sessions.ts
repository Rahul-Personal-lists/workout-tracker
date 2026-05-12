/**
 * One-off: list workout sessions on a given local-tz date for a user.
 *
 *   npx tsx scripts/list-day-sessions.ts <user-email> <YYYY-MM-DD> [tz]
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

function dateKeyInTz(d: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !serviceKey) throw new Error("Missing env");

  const email = process.argv[2];
  const dateKey = process.argv[3];
  const tz = process.argv[4] ?? "America/Toronto";
  if (!email || !dateKey) {
    throw new Error("Usage: npx tsx scripts/list-day-sessions.ts <email> <YYYY-MM-DD> [tz]");
  }

  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

  let user: { id: string; email?: string | null } | undefined;
  for (let page = 1; page <= 10; page++) {
    const { data, error: lErr } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (lErr) throw lErr;
    user = data?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (user) break;
    if (!data || data.users.length < 200) break;
  }
  if (!user) throw new Error(`No user with email ${email}`);
  console.log(`User: ${user.email}  tz: ${tz}  date: ${dateKey}`);

  const [y, m, d] = dateKey.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, d) - 24 * 60 * 60 * 1000);
  const end = new Date(Date.UTC(y, m - 1, d) + 2 * 24 * 60 * 60 * 1000);

  const { data: sessions, error } = await sb
    .from("workout_sessions")
    .select(
      `id, started_at, ended_at, duration_seconds, week_number, notes,
       program_days ( label, title )`
    )
    .eq("user_id", user.id)
    .gte("started_at", start.toISOString())
    .lt("started_at", end.toISOString())
    .order("started_at", { ascending: true });
  if (error) throw error;

  const onDay = (sessions ?? []).filter(
    (s) => dateKeyInTz(new Date(s.started_at), tz) === dateKey
  );
  console.log(`\nSessions on ${dateKey}: ${onDay.length}`);
  for (const s of onDay) {
    const day = (s.program_days as { label?: string; title?: string } | null) ?? null;
    const startedLocal = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
    }).format(new Date(s.started_at));
    const endedLocal = s.ended_at
      ? new Intl.DateTimeFormat("en-CA", {
          timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
        }).format(new Date(s.ended_at))
      : "—";
    console.log(`
  id:        ${s.id}
  status:    ${s.ended_at ? "completed" : "in-progress"}
  started:   ${startedLocal}  (${s.started_at})
  ended:     ${endedLocal}    ${s.ended_at ? `(${s.ended_at})` : ""}
  duration:  ${s.duration_seconds ?? "—"} s
  week:      ${s.week_number}
  day:       ${day?.label ?? "—"} · ${day?.title ?? "—"}
  notes:     ${s.notes ?? "—"}
  history:   /history/${s.id}`);

    const { count: setCount } = await sb
      .from("set_logs")
      .select("id", { count: "exact", head: true })
      .eq("session_id", s.id);
    console.log(`  set_logs:  ${setCount ?? 0}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
