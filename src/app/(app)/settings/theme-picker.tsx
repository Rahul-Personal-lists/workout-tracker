"use client";

import { useEffect, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const THEMES = [
  { key: "lime",   label: "Lime",   color: "#a3e635" },
  { key: "sky",    label: "Sky",    color: "#38bdf8" },
  { key: "amber",  label: "Amber",  color: "#fbbf24" },
  { key: "violet", label: "Violet", color: "#a78bfa" },
  { key: "rose",   label: "Rose",   color: "#fb7185" },
] as const;

type ThemeKey = (typeof THEMES)[number]["key"];

const COLOR_MODES = [
  { key: "system", label: "System", Icon: Monitor },
  { key: "light",  label: "Light",  Icon: Sun },
  { key: "dark",   label: "Dark",   Icon: Moon },
] as const;

type ColorMode = (typeof COLOR_MODES)[number]["key"];

export function ThemePicker() {
  const [theme, setTheme] = useState<ThemeKey>("lime");
  const [mode, setMode] = useState<ColorMode>("system");

  useEffect(() => {
    const accentMatch = document.cookie.match(/(?:^|;\s*)accent-theme=([^;]+)/);
    const storedAccent = (accentMatch?.[1] as ThemeKey | undefined) ?? "lime";
    setTheme(storedAccent);

    const modeMatch = document.cookie.match(/(?:^|;\s*)color-mode=([^;]+)/);
    const storedMode = (modeMatch?.[1] as ColorMode | undefined) ?? "system";
    setMode(storedMode);
  }, []);

  function pickAccent(key: ThemeKey) {
    setTheme(key);
    document.cookie = `accent-theme=${key};path=/;max-age=31536000;samesite=lax`;
    document.documentElement.dataset.theme = key;
  }

  function pickMode(key: ColorMode) {
    setMode(key);
    document.cookie = `color-mode=${key};path=/;max-age=31536000;samesite=lax`;
    document.documentElement.dataset.colorMode = key;
  }

  return (
    <div className="space-y-3">
      <section className="rounded-md border border-border bg-surface p-4 space-y-3">
        <p className="text-xs uppercase tracking-wide text-foreground-muted">Mode</p>
        <div
          role="radiogroup"
          aria-label="Color mode"
          className="grid grid-cols-3 gap-1.5"
        >
          {COLOR_MODES.map(({ key, label, Icon }) => {
            const active = mode === key;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => pickMode(key)}
                className={cn(
                  "h-11 rounded-md border flex items-center justify-center gap-1.5 text-xs transition-colors",
                  active
                    ? "bg-accent text-accent-foreground border-accent"
                    : "border-border hover:bg-surface-hover"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-md border border-border bg-surface p-4 space-y-3">
        <p className="text-xs uppercase tracking-wide text-foreground-muted">Accent</p>
        <div className="grid grid-cols-5 gap-2">
          {THEMES.map((t) => {
            const active = theme === t.key;
            return (
              <div key={t.key} className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={() => pickAccent(t.key)}
                  aria-pressed={active}
                  aria-label={t.label}
                  className={cn(
                    "w-full h-12 rounded-md border flex items-center justify-center transition-colors",
                    active ? "border-white" : "border-border"
                  )}
                  style={{ background: t.color }}
                >
                  {active ? (
                    <Check className="w-5 h-5 text-black" strokeWidth={3} />
                  ) : null}
                </button>
                <span
                  className={cn(
                    "text-[10px] tabular-nums",
                    active ? "text-foreground" : "text-foreground-muted"
                  )}
                >
                  {t.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
