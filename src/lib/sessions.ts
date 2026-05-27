import "server-only";

import type { createClient } from "./supabase/server";

// Sessions with no activity for this long are auto-finished (or deleted, if
// they have no logs) the next time the user re-enters the app or starts a
// workout.
const STALE_SESSION_MS = 2 * 60 * 60 * 1000;

// Returns the id of an in-progress session the caller should resume, or null
// if there's no session (either there never was one, or the stale one was
// just reaped). Side-effect: finishes or deletes a stale session in place.
export async function reapStaleSession(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string | null> {
  const { data: open } = await supabase
    .from("workout_sessions")
    .select("id, started_at")
    .eq("user_id", userId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!open) return null;

  const { data: lastLog } = await supabase
    .from("set_logs")
    .select("logged_at")
    .eq("session_id", open.id)
    .order("logged_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const lastActivity = lastLog?.logged_at ?? open.started_at;
  if (Date.now() - new Date(lastActivity).getTime() < STALE_SESSION_MS) {
    return open.id;
  }

  if (lastLog) {
    await supabase
      .from("workout_sessions")
      .update({ ended_at: lastActivity })
      .eq("id", open.id);
  } else {
    await supabase.from("workout_sessions").delete().eq("id", open.id);
  }
  return null;
}
