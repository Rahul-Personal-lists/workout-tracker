import { SettingsReplayTutorials } from "@/components/settings-replay-tutorials";
import { SettingsDetailHeader } from "../settings-detail-header";

export default function HelpPage() {
  return (
    <div className="space-y-5">
      <SettingsDetailHeader title="Help" />
      <SettingsReplayTutorials />
    </div>
  );
}
