"use client";

import { useState, useTransition } from "react";
import { Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { archiveExerciseFromProgram } from "@/app/actions/program";

export function ArchiveExerciseButton({ exerciseId }: { exerciseId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 2500);
      return;
    }
    startTransition(async () => {
      try {
        await archiveExerciseFromProgram({ exerciseId });
      } catch (err) {
        console.error("archive failed", err);
        setConfirming(false);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-label={confirming ? "Confirm remove" : "Remove exercise"}
      className={cn(
        "h-11 w-11 rounded flex items-center justify-center shrink-0 transition-colors",
        confirming
          ? "bg-red-500/15 text-red-400 border border-red-500/40"
          : "text-neutral-500 hover:text-neutral-300",
        pending && "opacity-50"
      )}
    >
      {confirming ? <X className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
    </button>
  );
}
