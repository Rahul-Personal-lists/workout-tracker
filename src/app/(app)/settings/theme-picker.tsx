"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const THEMES = [
  { key: "lime",   label: "Lime",   color: "#a3e635" },
  { key: "sky",    label: "Sky",    color: "#38bdf8" },
  { key: "amber",  label: "Amber",  color: "#fbbf24" },
  { key: "violet", label: "Violet", color: "#a78bfa" },
  { key: "rose",   label: "Rose",   color: "#fb7185" },
] as const;

type ThemeKey = (typeof THEMES)[number]["key"];

export function ThemePicker() {
  const [theme, setTheme] = useState<ThemeKey>("lime");

  useEffect(() => {
    const accentMatch = document.cookie.match(/(?:^|;\s*)accent-theme=([^;]+)/);
    const storedAccent = (accentMatch?.[1] as ThemeKey | undefined) ?? "lime";
    setTheme(storedAccent);
  }, []);

  function pickAccent(key: ThemeKey) {
    setTheme(key);
    document.cookie = `accent-theme=${key};path=/;max-age=31536000;samesite=lax`;
    document.documentElement.dataset.theme = key;
  }

  return (
    <div className="space-y-3">
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
