"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { wipeAllSessions } from "@/app/actions/workout";

export function WipeSessionsButton() {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 4000);
      return;
    }
    startTransition(async () => {
      try {
        await wipeAllSessions();
      } catch (err) {
        console.error("wipe failed", err);
        setConfirming(false);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={cn(
        "w-full h-12 rounded-md text-sm font-medium transition-colors",
        confirming
          ? "bg-red-500 text-white"
          : "border border-red-500/40 text-red-400",
        pending && "opacity-50"
      )}
    >
      {pending
        ? "Wiping…"
        : confirming
          ? "Tap again to confirm — this is permanent"
          : "Wipe all workout sessions"}
    </button>
  );
}
