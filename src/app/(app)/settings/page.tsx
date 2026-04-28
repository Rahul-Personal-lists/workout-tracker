import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out";
import { WipeSessionsButton } from "./wipe-sessions";
import { ThemePicker } from "./theme-picker";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { count: sessionCount } = await supabase
    .from("workout_sessions")
    .select("id", { count: "exact", head: true });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Settings</h1>
      </header>

      <section className="rounded-md border border-neutral-800 bg-neutral-900 p-4 space-y-1">
        <p className="text-xs text-neutral-500 uppercase tracking-wide">Signed in as</p>
        <p className="text-sm">{user?.email}</p>
      </section>

      <ThemePicker />

      <SignOutButton />

      <section className="space-y-3 pt-4">
        <h2 className="text-xs uppercase tracking-wide text-neutral-500">
          Danger zone
        </h2>
        <div className="rounded-md border border-red-500/30 bg-red-500/5 p-4 space-y-3">
          <p className="text-sm text-neutral-300">
            Delete all workout sessions and set logs.{" "}
            {sessionCount !== null
              ? `You have ${sessionCount} session${sessionCount === 1 ? "" : "s"}.`
              : ""}{" "}
            Your program and exercises stay.
          </p>
          <WipeSessionsButton />
        </div>
      </section>
    </div>
  );
}
