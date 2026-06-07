import { cookies } from "next/headers";
import { ThemePicker, THEME_KEYS, type ThemeKey } from "../theme-picker";
import { SettingsDetailHeader } from "../settings-detail-header";

export default async function ThemePage() {
  const raw = (await cookies()).get("accent-theme")?.value;
  const initialTheme: ThemeKey = THEME_KEYS.includes(raw as ThemeKey)
    ? (raw as ThemeKey)
    : "lime";

  return (
    <div className="space-y-5">
      <SettingsDetailHeader title="Theme" />
      <ThemePicker initialTheme={initialTheme} />
    </div>
  );
}
