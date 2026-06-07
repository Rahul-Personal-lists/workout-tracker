import { getProfile } from "@/lib/queries";
import { SettingsDetailHeader } from "../settings-detail-header";
import { SoundsClient } from "./sounds-client";

export default async function SoundsPage() {
  const profile = await getProfile({ signAvatar: false });
  return (
    <div className="space-y-5">
      <SettingsDetailHeader title="Sounds" />
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
