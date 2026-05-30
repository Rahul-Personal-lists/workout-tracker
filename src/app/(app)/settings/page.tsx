import {
  HelpCircle,
  Palette,
  Ruler,
  Tag,
  User,
  Volume2,
} from "lucide-react";
import { getProfile } from "@/lib/queries";
import { GoalWeightField } from "./goal-weight-field";
import { SettingsRow, SettingsSection, SettingsStaticRow } from "./settings-row";

export default async function SettingsPage() {
  const profile = await getProfile();

  const profileName = profile.display_name ?? "Set your name";
  const unitsLabel =
    profile.units === "metric" ? "Metric (kg / cm)" : "Imperial (lb / in)";

  const soundLabel = soundsSummary(
    profile.sound_lead_seconds,
    profile.vibration_lead_seconds
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Settings</h1>
      </header>

      <SettingsSection title="Profile">
        <SettingsRow
          href="/settings/profile"
          icon={
            profile.avatar_signed_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_signed_url}
                alt=""
                className="w-7 h-7 rounded-full object-cover -ml-1"
              />
            ) : (
              <User className="w-5 h-5" strokeWidth={1.75} />
            )
          }
          label={profileName}
          rightLabel="Edit"
        />
      </SettingsSection>

      <SettingsSection title="Body">
        <div className="px-4 py-3">
          <GoalWeightField
            initialGoalLb={profile.goal_weight_lb}
            units={profile.units}
          />
        </div>
      </SettingsSection>

      <SettingsSection title="Preferences">
        <SettingsRow
          href="/settings/units"
          icon={<Ruler className="w-5 h-5" strokeWidth={1.75} />}
          label="Units"
          rightLabel={unitsLabel}
        />
        <SettingsRow
          href="/settings/sounds"
          icon={<Volume2 className="w-5 h-5" strokeWidth={1.75} />}
          label="Sounds"
          rightLabel={soundLabel}
        />
        <SettingsRow
          href="/settings/theme"
          icon={<Palette className="w-5 h-5" strokeWidth={1.75} />}
          label="Theme"
          rightLabel="Accent"
        />
      </SettingsSection>

      <SettingsSection title="Help">
        <SettingsRow
          href="/settings/help"
          icon={<HelpCircle className="w-5 h-5" strokeWidth={1.75} />}
          label="Replay tutorials"
        />
      </SettingsSection>

      <SettingsSection title="About">
        <SettingsStaticRow
          icon={<Tag className="w-5 h-5" strokeWidth={1.75} />}
          label="Version"
          rightLabel="0.1.0"
        />
      </SettingsSection>
    </div>
  );
}

function soundsSummary(
  sound: number | null,
  vibration: number | null
): string {
  function part(v: number | null): string {
    if (v === null) return "off";
    if (v === 0) return "0s";
    return `${v}s`;
  }
  return `${part(sound)} / ${part(vibration)}`;
}
