import { formatInTimeZone } from "date-fns-tz";
import {
  createAdminClient,
  sendWeeklySummary,
  VANCOUVER_TZ,
} from "@/lib/weekly-summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
    }
    if (req.headers.get("authorization") !== `Bearer ${secret}`) {
      return new Response("unauthorized", { status: 401 });
    }

    // Two GH Actions cron lines fire each Monday UTC (covering PDT+PST). Only the
    // one that lands at Sunday evening Vancouver should actually run.
    const force = new URL(req.url).searchParams.get("force") === "1";
    if (!force) {
      const now = new Date();
      const hour = Number(formatInTimeZone(now, VANCOUVER_TZ, "H"));
      const dow = formatInTimeZone(now, VANCOUVER_TZ, "EEE");
      if (dow !== "Sun" || hour < 18 || hour > 20) {
        return Response.json({
          skipped: "out-of-window",
          observed: { dow, hour },
        });
      }
    }

    const missingEnv = [
      "NEXT_PUBLIC_SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "RESEND_API_KEY",
      "NEXT_PUBLIC_APP_URL",
    ].filter((k) => !process.env[k]);
    if (missingEnv.length > 0) {
      return Response.json(
        { error: "missing env vars", missing: missingEnv },
        { status: 500 }
      );
    }

    const admin = createAdminClient();
    const allowlist = (process.env.WEEKLY_EMAIL_ALLOWLIST ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const { data, error } = await admin.auth.admin.listUsers();
    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    const targets = allowlist.length
      ? data.users.filter((u) => u.email && allowlist.includes(u.email.toLowerCase()))
      : data.users;

    let sent = 0;
    let missed = 0;
    let skipped = 0;
    let errors = 0;
    const detail: Array<{ email: string | undefined; kind: string; error?: string }> = [];

    for (const u of targets) {
      try {
        const result = await sendWeeklySummary(admin, { id: u.id, email: u.email });
        if (result.kind === "sent") sent++;
        else if (result.kind === "missed") missed++;
        else skipped++;
        detail.push({ email: u.email, kind: result.kind });
      } catch (e) {
        errors++;
        const message = e instanceof Error ? e.message : String(e);
        detail.push({ email: u.email, kind: "error", error: message });
        console.error(`weekly-summary failed for ${u.email}:`, message);
      }
    }

    return Response.json({
      processed: targets.length,
      sent,
      missed,
      skipped,
      errors,
      detail,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    console.error("weekly-summary route failed:", message, stack);
    return Response.json({ error: message, stack }, { status: 500 });
  }
}
