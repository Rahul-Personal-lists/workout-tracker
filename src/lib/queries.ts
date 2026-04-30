import "server-only";
import { createClient } from "@/lib/supabase/server";
import { dateKeyInTz } from "@/lib/tz";

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
};

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
          id, order_index, name, sets, base_reps, start_weight, increment, tracked, note, image_url, archived_at
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
        .sort((a, b) => a.order_index - b.order_index),
    }))
    .sort((a, b) => a.day_number - b.day_number);

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

  const { data: inProgress } = await supabase
    .from("workout_sessions")
    .select("id, week_number, program_day_id")
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
    .select("week_number, program_day_id")
    .not("ended_at", "is", null)
    .order("ended_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lastFinished) {
    return { kind: "next", weekNumber: 1, day: program.days[0] };
  }

  const lastDay = program.days.find((d) => d.id === lastFinished.program_day_id);
  const lastDayNumber = lastDay?.day_number ?? program.days.length;

  let nextWeek = lastFinished.week_number;
  let nextDayNumber = lastDayNumber + 1;
  if (nextDayNumber > program.days.length) {
    nextDayNumber = 1;
    nextWeek += 1;
  }

  if (nextWeek > program.weeks) return { kind: "complete" };

  const day =
    program.days.find((d) => d.day_number === nextDayNumber) ?? program.days[0];

  return { kind: "next", weekNumber: nextWeek, day };
}

export async function getCompletedDayIdsForWeek(
  programId: string,
  weekNumber: number
): Promise<Set<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("program_day_id, program_days!inner(program_id)")
    .eq("week_number", weekNumber)
    .eq("program_days.program_id", programId)
    .not("ended_at", "is", null);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.program_day_id));
}

export type SetLog = {
  id: string;
  program_exercise_id: string;
  set_number: number;
  planned_weight: number | null;
  planned_reps: number | null;
  actual_weight: number | null;
  actual_reps: number | null;
  completed: boolean;
};

export async function getSessionLogs(sessionId: string): Promise<SetLog[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("set_logs")
    .select(
      "id, program_exercise_id, set_number, planned_weight, planned_reps, actual_weight, actual_reps, completed"
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
      "program_exercise_id, actual_weight, actual_reps, logged_at, session_id, completed"
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
      logged_at: row.logged_at,
    };
  }
  return out;
}

export type SessionSummary = {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  week_number: number;
  notes: string | null;
  day: { id: string; day_number: number; label: string; title: string } | null;
};

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
          id, order_index, name, sets, base_reps, start_weight, increment, tracked, note, image_url, archived_at
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
      exercises: (d.exercises ?? [])
        .slice()
        .sort((a, b) => a.order_index - b.order_index),
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
  weight_lb: number;
  calories: number | null;
  note: string | null;
};

export async function getBodyLogs(): Promise<BodyLogRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("body_logs")
    .select("log_date, weight_lb, calories, note")
    .order("log_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    log_date: r.log_date,
    weight_lb: Number(r.weight_lb),
    calories: r.calories,
    note: r.note,
  }));
}

export async function getExerciseHistory(
  programExerciseId: string
): Promise<{ name: string; points: ExerciseHistoryPoint[] } | null> {
  const supabase = await createClient();

  const { data: ex, error: exErr } = await supabase
    .from("program_exercises")
    .select("id, name")
    .eq("id", programExerciseId)
    .maybeSingle();
  if (exErr) throw exErr;
  if (!ex) return null;

  const { data: rows, error } = await supabase
    .from("set_logs")
    .select(
      "session_id, set_number, actual_weight, actual_reps, planned_weight, planned_reps, logged_at, completed"
    )
    .eq("program_exercise_id", programExerciseId)
    .eq("completed", true)
    .order("logged_at", { ascending: true });
  if (error) throw error;

  return {
    name: ex.name,
    points: (rows ?? []).map((r) => ({
      session_id: r.session_id,
      logged_at: r.logged_at,
      set_number: r.set_number,
      actual_weight: r.actual_weight,
      actual_reps: r.actual_reps,
      planned_weight: r.planned_weight,
      planned_reps: r.planned_reps,
    })),
  };
}

export type CalendarSession = {
  sessionId: string;
  status: "completed" | "in-progress";
  label: string;
};

export type CalendarDay = {
  date: string; // YYYY-MM-DD in local time
  sessions: CalendarSession[];
};

export async function getCalendarMonth(
  year: number,
  month: number,
  tz: string
): Promise<Map<string, CalendarDay>> {
  const supabase = await createClient();

  // Pad ±1 day in UTC so sessions whose local-tz date falls inside the
  // visible month are included even when their UTC instant straddles the boundary.
  const start = new Date(Date.UTC(year, month - 1, 1) - 24 * 60 * 60 * 1000);
  const end = new Date(Date.UTC(year, month, 1) + 24 * 60 * 60 * 1000);

  const { data: sessions, error } = await supabase
    .from("workout_sessions")
    .select(
      `id, started_at, ended_at,
       program_days ( label, title )`
    )
    .gte("started_at", start.toISOString())
    .lt("started_at", end.toISOString())
    .order("started_at", { ascending: true });
  if (error) throw error;

  const byDate = new Map<string, CalendarDay>();
  for (const s of sessions ?? []) {
    const key = dateKeyInTz(new Date(s.started_at), tz);
    const dayLabel = s.program_days?.label ?? "—";
    const dayTitle = s.program_days?.title ?? "—";
    const entry =
      byDate.get(key) ?? ({ date: key, sessions: [] } as CalendarDay);
    entry.sessions.push({
      sessionId: s.id,
      status: s.ended_at ? "completed" : "in-progress",
      label: `${dayLabel} · ${dayTitle}`,
    });
    byDate.set(key, entry);
  }
  return byDate;
}
