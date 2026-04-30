import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out";
import { ThemePicker } from "./theme-picker";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Settings</h1>
      </header>

      <section className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-neutral-500">
          Account
        </p>
        <div className="rounded-md border border-neutral-800 bg-neutral-900 p-4 space-y-1">
          <p className="text-xs text-neutral-500">Signed in as</p>
          <p className="text-sm">{user?.email}</p>
        </div>
        <SignOutButton />
      </section>

      <section className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-neutral-500">
          Preferences
        </p>
        <ThemePicker />
      </section>

      <p className="text-center text-[10px] text-neutral-600 tabular-nums pt-4">
        v0.1.0
      </p>
    </div>
  );
}
