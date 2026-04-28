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

      <section className="rounded-md border border-neutral-800 bg-neutral-900 p-4 space-y-1">
        <p className="text-xs text-neutral-500 uppercase tracking-wide">Signed in as</p>
        <p className="text-sm">{user?.email}</p>
      </section>

      <ThemePicker />

      <SignOutButton />
    </div>
  );
}
