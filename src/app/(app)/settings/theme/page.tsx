import { cookies } from "next/headers";
import { ThemePicker } from "../theme-picker";
import { resolveTheme } from "@/lib/themes";
import { SettingsDetailHeader } from "../settings-detail-header";

export default async function ThemePage() {
  const raw = (await cookies()).get("accent-theme")?.value;
  const initialTheme = resolveTheme(raw);

  return (
    <div className="space-y-5">
      <SettingsDetailHeader title="Theme" />
      <ThemePicker initialTheme={initialTheme} />
    </div>
  );
}
