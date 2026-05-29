"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setSoundPrefs } from "@/app/actions/profile";
import { cn } from "@/lib/utils";

type Lead = 0 | 5 | null; // null = off, 0 = at end, 5 = 5s early

const OPTIONS: Array<{ value: Lead; label: string }> = [
  { value: 5, label: "5 sec" },
  { value: 0, label: "0 sec" },
  { value: null, label: "Off" },
];

export function SoundsClient({
  initialSound,
  initialVibration,
}: {
  initialSound: number | null;
  initialVibration: number | null;
}) {
  const router = useRouter();
  const [sound, setSound] = useState<Lead>(normalize(initialSound));
  const [vibration, setVibration] = useState<Lead>(normalize(initialVibration));
  const [pending, startTransition] = useTransition();

  function commit(next: { sound?: Lead; vibration?: Lead }) {
    const nextSound = next.sound !== undefined ? next.sound : sound;
    const nextVibration =
      next.vibration !== undefined ? next.vibration : vibration;
    setSound(nextSound);
    setVibration(nextVibration);
    startTransition(async () => {
      await setSoundPrefs({
        soundLeadSeconds: nextSound,
        vibrationLeadSeconds: nextVibration,
      });
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <RadioCard
        title="Sound before step"
        value={sound}
        pending={pending}
        onChange={(v) => commit({ sound: v })}
      />
      <RadioCard
        title="Vibration before step"
        value={vibration}
        pending={pending}
        onChange={(v) => commit({ vibration: v })}
      />
    </div>
  );
}

function RadioCard({
  title,
  value,
  pending,
  onChange,
}: {
  title: string;
  value: Lead;
  pending: boolean;
  onChange: (v: Lead) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <p className="text-sm text-foreground mb-3">{title}</p>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((opt) => {
          const active = opt.value === value;
          const key = opt.value === null ? "off" : String(opt.value);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(opt.value)}
              disabled={pending}
              aria-pressed={active}
              className={cn(
                "h-11 rounded-md text-sm border outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] transition-colors",
                active
                  ? "bg-accent text-accent-foreground border-accent"
                  : "bg-surface-subtle text-foreground-muted border-border",
                pending && "opacity-60"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function normalize(value: number | null): Lead {
  if (value === 0) return 0;
  if (value === 5) return 5;
  return null;
}
