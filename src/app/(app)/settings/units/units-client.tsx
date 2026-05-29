"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { setUnits } from "@/app/actions/profile";
import type { Units } from "@/lib/units";
import { cn } from "@/lib/utils";

const OPTIONS: Array<{ id: Units; label: string; sub: string }> = [
  { id: "imperial", label: "Imperial", sub: "lb / in" },
  { id: "metric", label: "Metric", sub: "kg / cm" },
];

export function UnitsClient({ initialUnits }: { initialUnits: Units }) {
  const router = useRouter();
  const [units, setSelected] = useState<Units>(initialUnits);
  const [pending, startTransition] = useTransition();

  function pick(next: Units) {
    if (next === units) return;
    setSelected(next);
    startTransition(async () => {
      await setUnits({ units: next });
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-border bg-surface divide-y divide-[color:var(--color-border)]">
      {OPTIONS.map((opt) => {
        const active = opt.id === units;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => pick(opt.id)}
            disabled={pending}
            className={cn(
              "w-full flex items-center gap-3 px-4 h-14 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] transition-colors",
              pending && "opacity-60"
            )}
            aria-pressed={active}
          >
            <span
              className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                active
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border"
              )}
            >
              {active ? <Check className="w-3 h-3" strokeWidth={3} /> : null}
            </span>
            <span className="flex-1">
              <span className="text-sm text-foreground block">{opt.label}</span>
              <span className="text-xs text-foreground-muted block">{opt.sub}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
