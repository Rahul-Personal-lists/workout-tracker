"use client";

import { useRouter } from "next/navigation";
import { useTutorial } from "@/lib/stores/tutorial";

export function SettingsReplayTutorialButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        useTutorial.getState().resetAll();
        router.push("/today");
      }}
      className="btn-secondary w-full h-10 text-sm"
    >
      Replay tutorial
    </button>
  );
}
