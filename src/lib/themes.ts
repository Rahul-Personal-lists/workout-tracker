// Accent themes — plain data, deliberately NOT a "use client" module so both the
// server (root layout + theme page read the cookie) and the client ThemePicker can
// import the runtime values. Importing THEME_KEYS from a "use client" module into a
// Server Component turns it into a client-reference proxy (no .includes) — see #104.
export const THEMES = [
  { key: "lime", label: "Lime", color: "#a3e635" },
  { key: "sky", label: "Sky", color: "#38bdf8" },
  { key: "amber", label: "Amber", color: "#fbbf24" },
  { key: "violet", label: "Violet", color: "#a78bfa" },
  { key: "rose", label: "Rose", color: "#fb7185" },
] as const;

export type ThemeKey = (typeof THEMES)[number]["key"];
export const THEME_KEYS: ThemeKey[] = THEMES.map((t) => t.key);
export const DEFAULT_THEME: ThemeKey = "lime";

export function resolveTheme(value: string | undefined): ThemeKey {
  return THEME_KEYS.includes(value as ThemeKey) ? (value as ThemeKey) : DEFAULT_THEME;
}
