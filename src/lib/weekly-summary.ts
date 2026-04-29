import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { render } from "@react-email/render";
import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";
import { startOfWeek, endOfWeek, subWeeks } from "date-fns";
import {
  getMuscleGroupsForExercise,
  TOP_LEVEL_GROUPS,
  type TopLevelGroup,
} from "./muscle-groups";
import type { Database } from "./supabase/database.types";
import { WeeklySummaryEmail } from "@/emails/weekly-summary";

export const VANCOUVER_TZ = "America/Vancouver";

type Admin = SupabaseClient<Database>;

export function createAdminClient(): Admin {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}

type WeekWindow = { start: Date; end: Date };

export function getWindows(now = new Date()): {
  current: WeekWindow;
  trailing: WeekWindow[];
} {
  const zoned = toZonedTime(now, VANCOUVER_TZ);
  const toUtc = (d: Date) => fromZonedTime(d, VANCOUVER_TZ);
  return {
    current: {
      start: toUtc(startOfWeek(zoned, { weekStartsOn: 1 })),
      end: toUtc(endOfWeek(zoned, { weekStartsOn: 1 })),
    },
    trailing: Array.from({ length: 4 }, (_, i) => {
      const w = subWeeks(zoned, i + 1);
      return {
        start: toUtc(startOfWeek(w, { weekStartsOn: 1 })),
        end: toUtc(endOfWeek(w, { weekStartsOn: 1 })),
      };
    }),
  };
}

type SetRow = {
  actual_weight: number | null;
  actual_reps: number | null;
  exercise_name: string;
  exercise_image_url: string | null;
};

type WindowData = {
  sessionsCount: number;
  rows: SetRow[];
};

async function fetchWindow(
  admin: Admin,
  userId: string,
  start: Date,
  end: Date
): Promise<WindowData> {
  const { data: sessions, error } = await admin
    .from("workout_sessions")
    .select("id")
    .eq("user_id", userId)
    .gte("started_at", start.toISOString())
    .lte("started_at", end.toISOString())
    .not("ended_at", "is", null);
  if (error) throw error;
  if (!sessions || sessions.length === 0) return { sessionsCount: 0, rows: [] };

  const sessionIds = sessions.map((s) => s.id);
  const { data: logs, error: lErr } = await admin
    .from("set_logs")
    .select(
      "actual_weight, actual_reps, completed, program_exercises ( name, image_url )"
    )
    .in("session_id", sessionIds)
    .eq("completed", true);
  if (lErr) throw lErr;

  const rows: SetRow[] = (logs ?? []).map((r) => {
    const ex = r.program_exercises as
      | { name: string; image_url: string | null }
      | null;
    return {
      actual_weight: r.actual_weight,
      actual_reps: r.actual_reps,
      exercise_name: ex?.name ?? "",
      exercise_image_url: ex?.image_url ?? null,
    };
  });

  return { sessionsCount: sessions.length, rows };
}

function totalVolume(rows: SetRow[]): number {
  let v = 0;
  for (const r of rows) {
    if (r.actual_weight !== null && r.actual_reps !== null) {
      v += r.actual_weight * r.actual_reps;
    }
  }
  return v;
}

function emptyMuscleMap(): Record<TopLevelGroup, number> {
  return Object.fromEntries(TOP_LEVEL_GROUPS.map((g) => [g, 0])) as Record<
    TopLevelGroup,
    number
  >;
}

function bucketize(rows: SetRow[]): Record<TopLevelGroup, number> {
  const out = emptyMuscleMap();
  for (const r of rows) {
    if (r.actual_weight === null || r.actual_reps === null) continue;
    const groups = getMuscleGroupsForExercise(
      r.exercise_name,
      r.exercise_image_url
    );
    if (groups.length === 0) continue;
    const split = (r.actual_weight * r.actual_reps) / groups.length;
    for (const g of groups) out[g] += split;
  }
  return out;
}

export type WeeklySummary =
  | {
      kind: "sent";
      email: string;
      weekStart: Date;
      weekEnd: Date;
      totalVolume: number;
      sessionsCount: number;
      strongest: { group: TopLevelGroup; volume: number } | null;
      weakest:
        | { group: TopLevelGroup; pctChange: number; thisWeek: number; avg: number }
        | null;
      perMuscle: Record<TopLevelGroup, number>;
    }
  | {
      kind: "missed";
      email: string;
      weekStart: Date;
      weekEnd: Date;
      lastWeekVolume: number;
    };

export async function computeWeeklySummary(
  admin: Admin,
  userId: string,
  email: string,
  now = new Date()
): Promise<WeeklySummary> {
  const { current, trailing } = getWindows(now);

  const thisWeek = await fetchWindow(admin, userId, current.start, current.end);

  if (thisWeek.sessionsCount === 0) {
    const lastWeek = await fetchWindow(
      admin,
      userId,
      trailing[0].start,
      trailing[0].end
    );
    return {
      kind: "missed",
      email,
      weekStart: current.start,
      weekEnd: current.end,
      lastWeekVolume: Math.round(totalVolume(lastWeek.rows)),
    };
  }

  const thisWeekMuscle = bucketize(thisWeek.rows);
  const total = totalVolume(thisWeek.rows);

  const strongestEntry = TOP_LEVEL_GROUPS.map((g) => ({ g, v: thisWeekMuscle[g] }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v)[0];
  const strongest = strongestEntry
    ? { group: strongestEntry.g, volume: Math.round(strongestEntry.v) }
    : null;

  const trailingData = await Promise.all(
    trailing.map((w) => fetchWindow(admin, userId, w.start, w.end))
  );
  const trailingMuscle = trailingData.map((d) => bucketize(d.rows));
  const priorWeeksWithData = trailingData.filter((d) => d.sessionsCount > 0).length;

  const trailingAvg = emptyMuscleMap();
  for (const g of TOP_LEVEL_GROUPS) {
    const sum = trailingMuscle.reduce((acc, w) => acc + w[g], 0);
    trailingAvg[g] = sum / trailingMuscle.length;
  }

  let weakest: Extract<WeeklySummary, { kind: "sent" }>["weakest"] = null;
  if (priorWeeksWithData >= 2) {
    const candidates = TOP_LEVEL_GROUPS.filter((g) => trailingAvg[g] > 0)
      .map((g) => ({
        g,
        pct: (trailingAvg[g] - thisWeekMuscle[g]) / trailingAvg[g],
        thisWeek: thisWeekMuscle[g],
        avg: trailingAvg[g],
      }))
      .sort((a, b) => b.pct - a.pct);
    const top = candidates[0];
    if (top && top.pct > 0) {
      weakest = {
        group: top.g,
        pctChange: top.pct,
        thisWeek: Math.round(top.thisWeek),
        avg: Math.round(top.avg),
      };
    }
  } else {
    const ascending = TOP_LEVEL_GROUPS.map((g) => ({ g, v: thisWeekMuscle[g] }))
      .filter((x) => x.v > 0)
      .sort((a, b) => a.v - b.v);
    const low = ascending[0];
    if (low && strongest && low.g !== strongest.group) {
      weakest = {
        group: low.g,
        pctChange: 0,
        thisWeek: Math.round(low.v),
        avg: 0,
      };
    }
  }

  return {
    kind: "sent",
    email,
    weekStart: current.start,
    weekEnd: current.end,
    totalVolume: Math.round(total),
    sessionsCount: thisWeek.sessionsCount,
    strongest,
    weakest,
    perMuscle: Object.fromEntries(
      TOP_LEVEL_GROUPS.map((g) => [g, Math.round(thisWeekMuscle[g])])
    ) as Record<TopLevelGroup, number>,
  };
}

export async function renderAndSend(
  summary: WeeklySummary
): Promise<{ id: string | null }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? "Workout Tracker <onboarding@resend.dev>";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  if (!apiKey) throw new Error("Missing RESEND_API_KEY");

  const resend = new Resend(apiKey);

  const html = await render(WeeklySummaryEmail({ summary, appUrl }));

  const subject =
    summary.kind === "sent"
      ? `Your week: ${formatInTimeZone(
          summary.weekStart,
          VANCOUVER_TZ,
          "MMM d"
        )} – ${formatInTimeZone(summary.weekEnd, VANCOUVER_TZ, "MMM d")}`
      : "You missed this week";

  const { data, error } = await resend.emails.send({
    from,
    to: summary.email,
    subject,
    html,
  });
  if (error) throw new Error(error.message);
  return { id: data?.id ?? null };
}

export async function sendWeeklySummary(
  admin: Admin,
  user: { id: string; email: string | null | undefined },
  now = new Date()
): Promise<{ kind: "sent" | "missed" | "skip"; reason?: string; sendId?: string | null }> {
  if (!user.email) return { kind: "skip", reason: "no-email" };
  const summary = await computeWeeklySummary(admin, user.id, user.email, now);
  const result = await renderAndSend(summary);
  return { kind: summary.kind, sendId: result.id };
}
