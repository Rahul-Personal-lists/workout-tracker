"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { THEMES, type ThemeKey } from "@/lib/themes";

// initialTheme comes from the accent-theme cookie, read server-side in the
// page so SSR and first client render agree (no post-mount setState needed).
export function ThemePicker({ initialTheme }: { initialTheme: ThemeKey }) {
  const [theme, setTheme] = useState<ThemeKey>(initialTheme);

  function pickAccent(key: ThemeKey) {
    setTheme(key);
    // Writing the cookie + <html data-theme> from a click handler is intentional;
    // the React Compiler immutability rule over-flags these external DOM writes.
    /* eslint-disable react-hooks/immutability */
    document.cookie = `accent-theme=${key};path=/;max-age=31536000;samesite=lax`;
    document.documentElement.dataset.theme = key;
    /* eslint-enable react-hooks/immutability */
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
                    "w-full h-12 rounded-md border flex items-center justify-center transition-colors outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]",
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
