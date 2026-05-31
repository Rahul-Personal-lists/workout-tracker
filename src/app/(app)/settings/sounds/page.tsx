import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getProfile } from "@/lib/queries";
import { SoundsClient } from "./sounds-client";

export default async function SoundsPage() {
  const profile = await getProfile({ signAvatar: false });
  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <Link
          href="/settings"
          aria-label="Back to settings"
          className="h-9 w-9 rounded-full flex items-center justify-center border border-border bg-surface text-foreground-muted hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-semibold">Sounds</h1>
      </header>
      <p className="text-xs text-foreground-muted">
        Lead time before each rep / set cue.
      </p>
      <SoundsClient
        initialSound={profile.sound_lead_seconds}
        initialVibration={profile.vibration_lead_seconds}
      />
    </div>
  );
}
