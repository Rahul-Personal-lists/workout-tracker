import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ThemePicker, type ThemeKey } from "../theme-picker";

const THEME_KEYS: ThemeKey[] = ["lime", "sky", "amber", "violet", "rose"];

export default async function ThemePage() {
  const raw = (await cookies()).get("accent-theme")?.value;
  const initialTheme: ThemeKey = THEME_KEYS.includes(raw as ThemeKey)
    ? (raw as ThemeKey)
    : "lime";

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
        <h1 className="text-xl font-semibold">Theme</h1>
      </header>
      <ThemePicker initialTheme={initialTheme} />
    </div>
  );
}
