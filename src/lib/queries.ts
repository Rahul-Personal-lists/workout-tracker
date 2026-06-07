import "server-only";
import { createClient } from "@/lib/supabase/server";
import { dateKeyInTz, getUserTimezone } from "@/lib/tz";
import {
  getMuscleGroupsForExercise,
  TOP_LEVEL_GROUPS,
  type TopLevelGroup,
} from "@/lib/muscle-groups";
import type { ProgressBucketDef } from "@/lib/progress-range";
import { mondayKeyOf, paddedInstantsForWindow } from "@/lib/progress-range";
import type { ReframeRect, TrimBounds } from "@/lib/video-upload";

const VIDEO_BUCKET = "workout-photos";
const VIDEO_URL_TTL = 60 * 60 * 6; // 6h — gym sessions can outlive the photo 1h TTL

export type ProgramExercise = {
  id: string;
  order_index: number;
  name: string;
  sets: number;
  base_reps: number | null;
  start_weight: number | null;
  increment: number;
  tracked: boolean;
  note: string | null;
  image_url: string | null;
  archived_at: string | null;
  progression_weeks: number;
  kind: "reps" | "time";
  target_seconds: number | null;
  peak_taper: boolean;
  // Custom-video snapshot (all null/[] for catalog exercises).
  video_path: string | null;
  poster_path: string | null;
  crop_rect: ReframeRect | null;
  trim_start_seconds: number | null;
  trim_end_seconds: number | null;
  aspect_ratio: number | null;
  muscles: string[];
  custom_exercise_id: string | null;
  // Signed URLs attached after fetch (null until signed / for non-video rows).
  video_signed_url: string | null;
  poster_signed_url: string | null;
};

// Columns selected for every program_exercises sub-select (shared so the
// active-program, workout and history paths stay in lock-step).
const EXERCISE_COLUMNS =
  "id, order_index, name, sets, base_reps, start_weight, increment, tracked, note, image_url, archived_at, progression_weeks, kind, target_seconds, peak_taper, video_path, poster_path, crop_rect, trim_start_seconds, trim_end_seconds, aspect_ratio, muscles, custom_exercise_id";

// DB stores `kind` as a CHECK-constrained text column, so generated types widen
// it to `string`. Narrow back to the literal union we expose.
function normalizeExerciseKind<T extends { kind: string }>(
  ex: T
): Omit<T, "kind"> & { kind: "reps" | "time" } {
  return { ...ex, kind: ex.kind === "time" ? "time" : "reps" };
}

// Narrow a raw program_exercises row into ProgramExercise: kind union, crop_rect
// (jsonb -> ReframeRect), muscles default, and the (yet-unsigned) video URLs.
function shapeExercise<
  T extends {
    kind: string;
    crop_rect: unknown;
    muscles: string[] | null;
  }
>(ex: T): ProgramExercise {
  const k = normalizeExerciseKind(ex);
  return {
    ...k,
    crop_rect: (k.crop_rect as ReframeRect | null) ?? null,
    muscles: k.muscles ?? [],
    video_signed_url: null,
    poster_signed_url: null,
  } as unknown as ProgramExercise;
}

// Batch-sign the video + poster for every exercise carrying a clip and mutate
// the signed-URL fields in place. Index-aligned over the filtered list (every
// video row has both paths), matching the createSignedUrls pattern elsewhere.
async function attachVideoUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  exercises: ProgramExercise[]
): Promise<void> {
  const withVideo = exercises.filter((e) => e.video_path && e.poster_path);
  if (withVideo.length === 0) return;
  const videoPaths = withVideo.map((e) => e.video_path as string);
  const posterPaths = withVideo.map((e) => e.poster_path as string);
  const [video, poster] = await Promise.all([
    supabase.storage.from(VIDEO_BUCKET).createSignedUrls(videoPaths, VIDEO_URL_TTL),
    supabase.storage.from(VIDEO_BUCKET).createSignedUrls(posterPaths, VIDEO_URL_TTL),
  ]);
  withVideo.forEach((e, i) => {
    e.video_signed_url = video.data?.[i]?.signedUrl ?? null;
    e.poster_signed_url = poster.data?.[i]?.signedUrl ?? null;
  });
}

export type ProgramDay = {
  id: string;
  day_number: number;
  label: string;
  title: string;
  exercises: ProgramExercise[];
};

export type Program = {
  id: string;
  name: string;
  weeks: number;
  deload_weeks: number[];
  days: ProgramDay[];
};

export async function getCurrentProgram(
  opts: { includeArchived?: boolean } = {}
): Promise<Program | null> {
  const supabase = await createClient();

  const baseSelect = `
      id, name, weeks, deload_weeks,
      days:program_days (
        id, day_number, label, title, archived_at,
        exercises:program_exercises (
          ${EXERCISE_COLUMNS}
        )
      )
    `;

  // Prefer the explicitly active, non-archived program. Fall back to most recent
  // non-archived for legacy users created before is_active existed.
  const active = await supabase
    .from("programs")
    .select(baseSelect)
    .eq("is_active", true)
    .is("archived_at", null)
    .limit(1)
    .maybeSingle();
  if (active.error) throw active.error;

  let data = active.data;
  if (!data) {
    const fallback = await supabase
      .from("programs")
      .select(baseSelect)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (fallback.error) throw fallback.error;
    data = fallback.data;
  }
  if (!data) return null;

  const days = (data.days ?? [])
    .filter((d) => opts.includeArchived || d.archived_at === null)
    .map((d) => ({
      id: d.id,
      day_number: d.day_number,
      label: d.label,
      title: d.title,
      exercises: (d.exercises ?? [])
        .filter((ex) => opts.includeArchived || ex.archived_at === null)
        .slice()
        .sort((a, b) => a.order_index - b.order_index)
        .map(shapeExercise),
    }))
    .sort((a, b) => a.day_number - b.day_number);

  await attachVideoUrls(supabase, days.flatMap((d) => d.exercises));

  return {
    id: data.id,
    name: data.name,
    weeks: data.weeks,
    deload_weeks: data.deload_weeks,
    days,
  };
}

export type ProgramSummary = {
  id: string;
  name: string;
  is_active: boolean;
  archived_at: string | null;
  created_at: string;
};

export type ProfileRow = {
  display_name: string | null;
  gender: "male" | "female" | "other" | null;
  age: number | null;
  height_cm: number | null;
  avatar_path: string | null;
  avatar_signed_url: string | null;
  units: "imperial" | "metric";
  goal_weight_lb: number | null;
  sound_lead_seconds: number | null;
  vibration_lead_seconds: number | null;
};

// `signAvatar` controls the extra storage round-trip that mints a signed avatar
// URL. Screens that don't render the avatar (units, sounds) pass `false` to skip
// it — one fewer network hop behind their loading skeleton. Defaults to true so
// the hub and profile screens are unaffected.
export async function getProfile(
  { signAvatar = true }: { signAvatar?: boolean } = {}
): Promise<ProfileRow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "display_name, gender, age, height_cm, avatar_path, units, goal_weight_lb, sound_lead_seconds, vibration_lead_seconds"
    )
    .maybeSingle();
  if (error) throw error;

  let avatarSignedUrl: string | null = null;
  if (signAvatar && data?.avatar_path) {
    const { data: signed } = await supabase.storage
      .from("workout-photos")
      .createSignedUrl(data.avatar_path, 60 * 60);
    avatarSignedUrl = signed?.signedUrl ?? null;
  }

  return {
    display_name: data?.display_name ?? null,
    gender: (data?.gender as ProfileRow["gender"]) ?? null,
    age: data?.age ?? null,
    height_cm: data?.height_cm !== null && data?.height_cm !== undefined
      ? Number(data.height_cm)
      : null,
    avatar_path: data?.avatar_path ?? null,
    avatar_signed_url: avatarSignedUrl,
    units: (data?.units as "imperial" | "metric") ?? "imperial",
    goal_weight_lb:
      data?.goal_weight_lb !== null && data?.goal_weight_lb !== undefined
        ? Number(data.goal_weight_lb)
        : null,
    sound_lead_seconds: data?.sound_lead_seconds ?? null,
    vibration_lead_seconds: data?.vibration_lead_seconds ?? null,
  };
}

export async function getTodayWeightLb(): Promise<number | null> {
  const supabase = await createClient();
  // Use the user's tz, not the server's, so "today" matches every other
  // date-key path (getNextWorkout, progress, calendar) on a UTC runtime.
  const key = dateKeyInTz(new Date(), await getUserTimezone());
  const { data, error } = await supabase
    .from("body_logs")
    .select("weight_lb")
    .eq("log_date", key)
    .maybeSingle();
  if (error) throw error;
  return data?.weight_lb !== null && data?.weight_lb !== undefined
    ? Number(data.weight_lb)
    : null;
}

export async function getAllPrograms(): Promise<ProgramSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("programs")
    .select("id, name, is_active, archived_at, created_at")
    .is("archived_at", null)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function hasInProgressSession(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("id")
    .is("ended_at", null)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export type NextWorkout =
  | { kind: "in-progress"; sessionId: string; weekNumber: number; day: ProgramDay }
  | { kind: "next"; weekNumber: number; day: ProgramDay }
  | { kind: "complete" };

export async function getNextWorkout(
  program: Program
): Promise<NextWorkout | null> {
  if (program.days.length === 0) return null;
  const supabase = await createClient();
  const dayIds = program.days.map((d) => d.id);

  const { data: inProgress } = await supabase
    .from("workout_sessions")
    .select("id, week_number, program_day_id")
    .in("program_day_id", dayIds)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (inProgress) {
    const day = program.days.find((d) => d.id === inProgress.program_day_id);
    if (day) {
      return {
        kind: "in-progress",
        sessionId: inProgress.id,
        weekNumber: inProgress.week_number,
        day,
      };
    }
  }

  const { data: lastFinished } = await supabase
    .from("workout_sessions")
    .select("week_number, program_day_id, ended_at, is_rest_skip")
    .in("program_day_id", dayIds)
    .not("ended_at", "is", null)
    .order("ended_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lastFinished) {
    return { kind: "next", weekNumber: 1, day: program.days[0] };
  }

  const lastIdx = program.days.findIndex(
    (d) => d.id === lastFinished.program_day_id
  );
  if (lastIdx === -1) {
    return { kind: "next", weekNumber: 1, day: program.days[0] };
  }

  // If the last finished session ended on today's calendar date (in the user's
  // timezone), keep "next" pointing at that same day so the /program page sits
  // on today's completed workout instead of skipping ahead. Tomorrow this
  // comparison flips false and the normal cycle advance below runs.
  //
  // Rest-day *skips* are excluded: a skip exists precisely to advance past the
  // rest day, so pinning the page to the just-skipped day until tomorrow would
  // strand the user on it. Skips always fall through to the cycle advance.
  if (lastFinished.ended_at && !lastFinished.is_rest_skip) {
    const tz = await getUserTimezone();
    const finishedDate = dateKeyInTz(new Date(lastFinished.ended_at), tz);
    const todayDate = dateKeyInTz(new Date(), tz);
    if (finishedDate === todayDate) {
      return {
        kind: "next",
        weekNumber: lastFinished.week_number,
        day: program.days[lastIdx],
      };
    }
  }

  let nextWeek = lastFinished.week_number;
  let nextIdx = lastIdx + 1;
  if (nextIdx >= program.days.length) {
    nextIdx = 0;
    nextWeek += 1;
  }

  if (nextWeek > program.weeks) return { kind: "complete" };

  return { kind: "next", weekNumber: nextWeek, day: program.days[nextIdx] };
}

// Keys: `${program_day_id}:${week_number}` — matches the slot identity used by
// the /program day pills. Returned as a Set for O(1) lookups while rendering
// up to weeks × days pills.
export async function getCompletedSlots(
  program: Program,
): Promise<Set<string>> {
  if (program.days.length === 0) return new Set();
  const supabase = await createClient();
  const dayIds = program.days.map((d) => d.id);
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("program_day_id, week_number")
    .in("program_day_id", dayIds)
    .not("ended_at", "is", null);
  if (error || !data) return new Set();
  return new Set(data.map((r) => `${r.program_day_id}:${r.week_number}`));
}

// Mirrors UNDO_SKIP_WINDOW_MS in actions/workout.ts.
const UNDO_SKIP_WINDOW_MS = 5 * 60 * 1000;

export type UndoableSkip = {
  dayLabel: string;
  dayTitle: string;
  expiresAt: number;
};

export async function getUndoableSkip(): Promise<UndoableSkip | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;
  if (!userId) return null;

  const { data } = await supabase
    .from("workout_sessions")
    .select("ended_at, program_days ( label, title )")
    .eq("user_id", userId)
    .eq("is_rest_skip", true)
    .order("ended_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data?.ended_at) return null;

  const expiresAt = new Date(data.ended_at).getTime() + UNDO_SKIP_WINDOW_MS;
  if (Date.now() >= expiresAt) return null;

  return {
    dayLabel: data.program_days?.label ?? "—",
    dayTitle: data.program_days?.title ?? "—",
    expiresAt,
  };
}

export type TopSet = { weight: number; reps: number };

// All-time best top-set per exercise across every completed log.
// "Best" = highest weight, ties broken by reps. Excludes incomplete sets.
export async function getAllTimeTopByExercise(
  exerciseIds: string[]
): Promise<Map<string, TopSet>> {
  if (exerciseIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("set_logs")
    .select("program_exercise_id, actual_weight, actual_reps")
    .in("program_exercise_id", exerciseIds)
    .eq("completed", true)
    .not("actual_weight", "is", null)
    .not("actual_reps", "is", null);
  if (error) throw error;
  const out = new Map<string, TopSet>();
  for (const row of data ?? []) {
    if (row.actual_weight === null || row.actual_reps === null) continue;
    const cur = out.get(row.program_exercise_id);
    if (
      !cur ||
      row.actual_weight > cur.weight ||
      (row.actual_weight === cur.weight && row.actual_reps > cur.reps)
    ) {
      out.set(row.program_exercise_id, {
        weight: row.actual_weight,
        reps: row.actual_reps,
      });
    }
  }
  return out;
}

export type SetLog = {
  id: string;
  program_exercise_id: string;
  set_number: number;
  planned_weight: number | null;
  planned_reps: number | null;
  actual_weight: number | null;
  actual_reps: number | null;
  planned_seconds: number | null;
  actual_seconds: number | null;
  completed: boolean;
};

export async function getSessionLogs(sessionId: string): Promise<SetLog[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("set_logs")
    .select(
      "id, program_exercise_id, set_number, planned_weight, planned_reps, actual_weight, actual_reps, planned_seconds, actual_seconds, completed"
    )
    .eq("session_id", sessionId)
    .order("set_number", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export type LastSessionHint = {
  program_exercise_id: string;
  actual_weight: number | null;
  actual_reps: number | null;
  actual_seconds: number | null;
  logged_at: string;
};

export async function getLastSessionHints(
  exerciseIds: string[],
  excludeSessionId: string
): Promise<Record<string, LastSessionHint>> {
  if (exerciseIds.length === 0) return {};
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("set_logs")
    .select(
      "program_exercise_id, actual_weight, actual_reps, actual_seconds, logged_at, session_id, completed"
    )
    .in("program_exercise_id", exerciseIds)
    .eq("completed", true)
    .neq("session_id", excludeSessionId)
    .order("logged_at", { ascending: false });

  if (error) throw error;

  const out: Record<string, LastSessionHint> = {};
  for (const row of data ?? []) {
    if (out[row.program_exercise_id]) continue;
    out[row.program_exercise_id] = {
      program_exercise_id: row.program_exercise_id,
      actual_weight: row.actual_weight,
      actual_reps: row.actual_reps,
      actual_seconds: row.actual_seconds,
      logged_at: row.logged_at,
    };
  }
  return out;
}

export async function getSession(sessionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_sessions")
    .select(
      `
      id, started_at, ended_at, duration_seconds, week_number, notes, program_day_id
`
    )
    .eq("id", sessionId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export type PreviousDayNote = {
  notes: string;
  startedAt: string;
  weekNumber: number;
};

export async function getPreviousDayNote(
  programDayId: string,
  excludeSessionId: string,
): Promise<PreviousDayNote | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("notes, started_at, week_number")
    .eq("program_day_id", programDayId)
    .neq("id", excludeSessionId)
    .not("ended_at", "is", null)
    .not("notes", "is", null)
    .neq("notes", "")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data || !data.notes) return null;
  return {
    notes: data.notes,
    startedAt: data.started_at,
    weekNumber: data.week_number,
  };
}

export type SessionContext = {
  session: {
    id: string;
    started_at: string;
    ended_at: string | null;
    duration_seconds: number | null;
    week_number: number;
    notes: string | null;
    program_day_id: string;
  };
  program: { id: string; name: string; weeks: number; deload_weeks: number[] };
  day: { id: string; label: string; title: string; exercises: ProgramExercise[] };
};

// Resolves a session's day + parent program by following its FK chain, so history
// renders correctly even when the session belongs to a non-active program.
export async function getSessionContext(
  sessionId: string
): Promise<SessionContext | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_sessions")
    .select(
      `
      id, started_at, ended_at, duration_seconds, week_number, notes, program_day_id,
      program_days!inner (
        id, label, title,
        programs!inner ( id, name, weeks, deload_weeks ),
        exercises:program_exercises (
          ${EXERCISE_COLUMNS}
        )
      )
    `
    )
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw error;
  if (!data || !data.program_days || !data.program_days.programs) return null;

  const d = data.program_days;
  const p = d.programs;
  const exercises = (d.exercises ?? [])
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .map(shapeExercise);
  await attachVideoUrls(supabase, exercises);

  return {
    session: {
      id: data.id,
      started_at: data.started_at,
      ended_at: data.ended_at,
      duration_seconds: data.duration_seconds,
      week_number: data.week_number,
      notes: data.notes,
      program_day_id: data.program_day_id,
    },
    program: {
      id: p.id,
      name: p.name,
      weeks: p.weeks,
      deload_weeks: p.deload_weeks,
    },
    day: {
      id: d.id,
      label: d.label,
      title: d.title,
      exercises,
    },
  };
}

export type HistoryRow = {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  week_number: number;
  day_label: string;
  day_title: string;
  set_count: number;
  total_volume: number;
};

export async function getSessionHistory(): Promise<HistoryRow[]> {
  const supabase = await createClient();

  const { data: sessions, error } = await supabase
    .from("workout_sessions")
    .select(
      `
      id, started_at, ended_at, duration_seconds, week_number,
      program_days ( label, title )
    `
    )
    .not("ended_at", "is", null)
    .order("started_at", { ascending: false });
  if (error) throw error;
  if (!sessions || sessions.length === 0) return [];

  const sessionIds = sessions.map((s) => s.id);
  const { data: logs, error: logsErr } = await supabase
    .from("set_logs")
    .select("session_id, actual_weight, actual_reps, completed")
    .in("session_id", sessionIds)
    .eq("completed", true);
  if (logsErr) throw logsErr;

  const agg = new Map<string, { sets: number; volume: number }>();
  for (const row of logs ?? []) {
    const slot = agg.get(row.session_id) ?? { sets: 0, volume: 0 };
    slot.sets += 1;
    if (row.actual_weight !== null && row.actual_reps !== null) {
      slot.volume += row.actual_weight * row.actual_reps;
    }
    agg.set(row.session_id, slot);
  }

  return sessions.map((s) => ({
    id: s.id,
    started_at: s.started_at,
    ended_at: s.ended_at,
    duration_seconds: s.duration_seconds,
    week_number: s.week_number,
    day_label: s.program_days?.label ?? "—",
    day_title: s.program_days?.title ?? "—",
    set_count: agg.get(s.id)?.sets ?? 0,
    total_volume: Math.round(agg.get(s.id)?.volume ?? 0),
  }));
}

export type ExerciseHistoryPoint = {
  session_id: string;
  logged_at: string;
  set_number: number;
  actual_weight: number | null;
  actual_reps: number | null;
  planned_weight: number | null;
  planned_reps: number | null;
  actual_seconds: number | null;
  planned_seconds: number | null;
};

export type SessionPhoto = {
  id: string;
  storage_path: string;
  signed_url: string;
  created_at: string;
};

export async function getSessionPhotos(sessionId: string): Promise<SessionPhoto[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_session_photos")
    .select("id, storage_path, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const paths = data.map((p) => p.storage_path);
  const { data: signed, error: signErr } = await supabase.storage
    .from("workout-photos")
    .createSignedUrls(paths, 60 * 60);
  if (signErr) throw signErr;

  return data.map((row, i) => ({
    id: row.id,
    storage_path: row.storage_path,
    created_at: row.created_at,
    signed_url: signed?.[i]?.signedUrl ?? "",
  }));
}

export type BodyLogRow = {
  log_date: string;
  weight_lb: number | null;
  calories: number | null;
  body_fat_pct: number | null;
  note: string | null;
};

export async function getBodyLogs(): Promise<BodyLogRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("body_logs")
    .select("log_date, weight_lb, calories, body_fat_pct, note")
    .order("log_date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    log_date: r.log_date,
    weight_lb: r.weight_lb !== null ? Number(r.weight_lb) : null,
    calories: r.calories,
    body_fat_pct: r.body_fat_pct !== null ? Number(r.body_fat_pct) : null,
    note: r.note,
  }));
}

export type BodyMeasurementRow = {
  log_date: string;
  metric: string;
  value_cm: number;
};

export async function getBodyMeasurements(): Promise<BodyMeasurementRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("body_measurements")
    .select("log_date, metric, value_cm")
    .order("log_date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    log_date: r.log_date,
    metric: r.metric,
    value_cm: Number(r.value_cm),
  }));
}

export async function getGoalWeight(): Promise<number | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("goal_weight_lb")
    .maybeSingle();
  if (error) throw error;
  const v = data?.goal_weight_lb;
  return v === null || v === undefined ? null : Number(v);
}

// Catalog slugs the user has favorited. RLS scopes rows to the user. Degrades
// to "no favorites" on any read error (same resilience as getCompletedSlots) so
// the exercise library never 500s — e.g. before the migration is pushed.
export async function getFavoriteSlugs(): Promise<Set<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercise_favorites")
    .select("exercise_slug");
  if (error || !data) return new Set();
  return new Set(data.map((r) => r.exercise_slug));
}

export type CustomExercise = {
  id: string;
  name: string;
  muscles: string[];
  video_path: string;
  poster_path: string;
  video_signed_url: string;
  poster_signed_url: string;
  crop_rect: ReframeRect | null;
  trim: TrimBounds | null;
  aspect_ratio: number | null;
};

// The user's reusable custom-exercise library (newest first), with signed video
// + poster URLs. Degrades to [] on error so a missing migration can't 500 the
// add/library pages.
export async function getCustomExercises(): Promise<CustomExercise[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("custom_exercises")
    .select(
      "id, name, muscles, video_path, poster_path, crop_rect, trim_start_seconds, trim_end_seconds, aspect_ratio"
    )
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  if (data.length === 0) return [];

  const videoPaths = data.map((r) => r.video_path);
  const posterPaths = data.map((r) => r.poster_path);
  const [video, poster] = await Promise.all([
    supabase.storage.from(VIDEO_BUCKET).createSignedUrls(videoPaths, VIDEO_URL_TTL),
    supabase.storage.from(VIDEO_BUCKET).createSignedUrls(posterPaths, VIDEO_URL_TTL),
  ]);

  return data.map((r, i) => ({
    id: r.id,
    name: r.name,
    muscles: r.muscles ?? [],
    video_path: r.video_path,
    poster_path: r.poster_path,
    video_signed_url: video.data?.[i]?.signedUrl ?? "",
    poster_signed_url: poster.data?.[i]?.signedUrl ?? "",
    crop_rect: (r.crop_rect as ReframeRect | null) ?? null,
    trim:
      r.trim_start_seconds != null && r.trim_end_seconds != null
        ? { startSec: r.trim_start_seconds, endSec: r.trim_end_seconds }
        : null,
    aspect_ratio: r.aspect_ratio,
  }));
}

export type BodyPhotoRow = {
  id: string;
  log_date: string;
  storage_path: string;
  signed_url: string;
  created_at: string;
};

export async function getBodyPhotos(): Promise<BodyPhotoRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("body_log_photos")
    .select("id, log_date, storage_path, created_at")
    .order("log_date", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const paths = data.map((p) => p.storage_path);
  const { data: signed, error: signErr } = await supabase.storage
    .from("workout-photos")
    .createSignedUrls(paths, 60 * 60);
  if (signErr) throw signErr;

  return data.map((row, i) => ({
    id: row.id,
    log_date: row.log_date,
    storage_path: row.storage_path,
    created_at: row.created_at,
    signed_url: signed?.[i]?.signedUrl ?? "",
  }));
}

export async function getExerciseHistory(
  programExerciseId: string
): Promise<{
  name: string;
  kind: "reps" | "time";
  points: ExerciseHistoryPoint[];
} | null> {
  const supabase = await createClient();

  const { data: ex, error: exErr } = await supabase
    .from("program_exercises")
    .select("id, name, kind")
    .eq("id", programExerciseId)
    .maybeSingle();
  if (exErr) throw exErr;
  if (!ex) return null;

  const { data: rows, error } = await supabase
    .from("set_logs")
    .select(
      "session_id, set_number, actual_weight, actual_reps, planned_weight, planned_reps, actual_seconds, planned_seconds, logged_at, completed"
    )
    .eq("program_exercise_id", programExerciseId)
    .eq("completed", true)
    .order("logged_at", { ascending: true });
  if (error) throw error;

  return {
    name: ex.name,
    kind: (ex.kind ?? "reps") as "reps" | "time",
    points: (rows ?? []).map((r) => ({
      session_id: r.session_id,
      logged_at: r.logged_at,
      set_number: r.set_number,
      actual_weight: r.actual_weight,
      actual_reps: r.actual_reps,
      planned_weight: r.planned_weight,
      planned_reps: r.planned_reps,
      actual_seconds: r.actual_seconds,
      planned_seconds: r.planned_seconds,
    })),
  };
}

// Consecutive Mon-Sun weeks (counting back from this week, or last week if
// this week is still empty) with ≥1 completed workout. Returns 0 if neither
// this week nor last week have any activity — so the streak doesn't appear
// to "drop" the instant a new week starts but holds for up to 7 days of
// grace before resetting.
export async function getWeekStreak(tz: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("started_at")
    .not("ended_at", "is", null)
    .eq("is_rest_skip", false);
  if (error) throw error;
  if (!data || data.length === 0) return 0;

  const weeksWithWorkouts = new Set<string>();
  for (const s of data) {
    const dateKey = dateKeyInTz(new Date(s.started_at), tz);
    weeksWithWorkouts.add(mondayKeyOf(dateKey));
  }

  const todayKey = dateKeyInTz(new Date(), tz);
  const thisMonday = mondayKeyOf(todayKey);

  // Decide where the streak should start. If this week has activity, start
  // here. Otherwise, allow last week as the anchor (gives a 7-day grace
  // period). Anything older = streak has been broken.
  let cursor: string;
  if (weeksWithWorkouts.has(thisMonday)) {
    cursor = thisMonday;
  } else {
    const lastMonday = mondayKeyOf(prevWeekKey(thisMonday));
    if (!weeksWithWorkouts.has(lastMonday)) return 0;
    cursor = lastMonday;
  }

  let count = 0;
  while (weeksWithWorkouts.has(cursor)) {
    count += 1;
    cursor = mondayKeyOf(prevWeekKey(cursor));
  }
  return count;
}

// Returns YYYY-MM-DD that's exactly 7 days earlier than the given Monday key.
// Kept inline (rather than exported from progress-range) because it's only
// used here.
function prevWeekKey(mondayKey: string): string {
  const [y, m, d] = mondayKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d - 7));
  const ny = date.getUTCFullYear();
  const nm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const nd = String(date.getUTCDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
}

// User-tz date key (YYYY-MM-DD) of the most recently completed session, or
// null if the user has never finished a workout. Used by the `Last` tab so
// the chart points at the day the user actually trained, not "today".
export async function getLatestSessionDateKey(
  tz: string
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("started_at")
    .not("ended_at", "is", null)
    .eq("is_rest_skip", false)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return dateKeyInTz(new Date(data.started_at), tz);
}

// Map of YYYY-MM-DD (in the user's tz) → latest session id on that date.
// Used by the progress page's month grid widget to mark days with workouts.
export async function getSessionsByDateForMonth(
  year: number,
  month: number,
  tz: string
): Promise<Map<string, string>> {
  const supabase = await createClient();

  // Pad ±1 UTC day so user-tz boundary days inside this month are included.
  const start = new Date(Date.UTC(year, month - 1, 1) - 24 * 60 * 60 * 1000);
  const end = new Date(Date.UTC(year, month, 1) + 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("workout_sessions")
    .select("id, started_at, ended_at")
    .gte("started_at", start.toISOString())
    .lt("started_at", end.toISOString())
    .eq("is_rest_skip", false)
    .order("started_at", { ascending: true });
  if (error) throw error;

  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  const out = new Map<string, string>();
  for (const s of data ?? []) {
    const dateKey = dateKeyInTz(new Date(s.started_at), tz);
    if (!dateKey.startsWith(monthKey)) continue;
    out.set(dateKey, s.id);
  }
  return out;
}

export type ProgressTotals = {
  workouts: number;
  exercises: number;
  minutes: number;
  reps: number;
  volume: number;
};

export type ProgressBucket = {
  key: string;
  label: string;
  workouts: number;
};

export type ProgressData = {
  totals: ProgressTotals;
  buckets: ProgressBucket[];
  muscleSets: Record<TopLevelGroup, number>;
};

function emptyMuscleSets(): Record<TopLevelGroup, number> {
  return Object.fromEntries(TOP_LEVEL_GROUPS.map((g) => [g, 0])) as Record<
    TopLevelGroup,
    number
  >;
}

export async function getProgressForRange(
  startKey: string,
  endKey: string,
  buckets: ProgressBucketDef[],
  bucketKind: "day" | "week" | "month",
  tz: string
): Promise<ProgressData> {
  const supabase = await createClient();
  const { startISO, endISO } = paddedInstantsForWindow(startKey, endKey);

  const { data: sessions, error: sErr } = await supabase
    .from("workout_sessions")
    .select("id, started_at, duration_seconds")
    .gte("started_at", startISO)
    .lt("started_at", endISO)
    .not("ended_at", "is", null)
    .eq("is_rest_skip", false);
  if (sErr) throw sErr;

  const bucketKeySet = new Set(buckets.map((b) => b.key));
  type Tagged = {
    id: string;
    startedAt: string;
    durationSeconds: number;
    bucketKey: string;
  };
  const tagged: Tagged[] = [];
  for (const s of sessions ?? []) {
    const dateKey = dateKeyInTz(new Date(s.started_at), tz);
    if (dateKey < startKey || dateKey > endKey) continue;
    const bucketKey =
      bucketKind === "month"
        ? dateKey.slice(0, 7)
        : bucketKind === "week"
          ? mondayKeyOf(dateKey)
          : dateKey;
    if (!bucketKeySet.has(bucketKey)) continue;
    tagged.push({
      id: s.id,
      startedAt: s.started_at,
      durationSeconds: s.duration_seconds ?? 0,
      bucketKey,
    });
  }

  const muscleSets = emptyMuscleSets();
  const exerciseSet = new Set<string>();
  let totalReps = 0;
  let totalVolume = 0;

  if (tagged.length > 0) {
    const sessionIds = tagged.map((t) => t.id);
    const { data: logs, error: lErr } = await supabase
      .from("set_logs")
      .select(
        "session_id, program_exercise_id, actual_weight, actual_reps, program_exercises ( name, image_url, muscles )"
      )
      .in("session_id", sessionIds)
      .eq("completed", true);
    if (lErr) throw lErr;

    for (const r of logs ?? []) {
      exerciseSet.add(r.program_exercise_id);
      if (r.actual_reps !== null) totalReps += r.actual_reps;
      if (r.actual_weight !== null && r.actual_reps !== null) {
        totalVolume += r.actual_weight * r.actual_reps;
      }
      const ex = r.program_exercises as
        | { name: string; image_url: string | null; muscles: string[] | null }
        | null;
      const groups = getMuscleGroupsForExercise(
        ex?.name ?? "",
        ex?.image_url ?? null,
        ex?.muscles ?? null
      );
      for (const g of groups) muscleSets[g] += 1;
    }
  }

  const bucketAgg = new Map<string, { workouts: number }>();
  let totalSeconds = 0;
  for (const t of tagged) {
    totalSeconds += t.durationSeconds;
    const cur = bucketAgg.get(t.bucketKey);
    if (!cur) {
      bucketAgg.set(t.bucketKey, { workouts: 1 });
    } else {
      cur.workouts += 1;
    }
  }

  return {
    totals: {
      workouts: tagged.length,
      exercises: exerciseSet.size,
      minutes: Math.round(totalSeconds / 60),
      reps: totalReps,
      volume: Math.round(totalVolume),
    },
    buckets: buckets.map((b) => {
      const entry = bucketAgg.get(b.key);
      return {
        key: b.key,
        label: b.label,
        workouts: entry?.workouts ?? 0,
      };
    }),
    muscleSets,
  };
}
