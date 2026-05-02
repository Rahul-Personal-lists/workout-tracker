import { createClient } from "@/lib/supabase/server";
import { getDisplayName } from "@/lib/queries";
import { DisplayNameField } from "./display-name-field";
import { SignOutButton } from "./sign-out";
import { ThemePicker } from "./theme-picker";

export default async function SettingsPage() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    displayName,
  ] = await Promise.all([supabase.auth.getUser(), getDisplayName()]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Settings</h1>
      </header>

      <section className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-foreground-muted">
          Profile
        </p>
        <DisplayNameField initialName={displayName} />
        <div className="rounded-md border border-border bg-surface p-4 space-y-1">
          <p className="text-xs text-foreground-muted">Signed in as</p>
          <p className="text-sm">{user?.email}</p>
        </div>
        <SignOutButton />
      </section>

      <section className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-foreground-muted">
          Preferences
        </p>
        <ThemePicker />
      </section>

      <p className="text-center text-[10px] text-foreground-muted tabular-nums pt-4">
        v0.1.0
      </p>
    </div>
  );
}
