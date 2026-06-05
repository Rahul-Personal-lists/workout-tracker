"use client";

import { useTransition } from "react";
import { seedPresetProgram } from "@/app/actions/program";
import { toast } from "@/components/toast";

export function StartProgramButton({ presetId }: { presetId: string }) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      try {
        await seedPresetProgram({ presetId });
        // Success redirects to /program server-side; control won't return here.
      } catch {
        // A thrown error is a real failure — most likely the 2-program cap.
        // (Stage 4 routes this into the archive-one flow instead.)
        toast(
          "Couldn't start — you may already have 2 programs. Archive one and try again.",
        );
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="btn-primary w-full h-14 text-base"
    >
      {pending ? "Starting…" : "Start This Program"}
    </button>
  );
}
