"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTutorial } from "@/lib/stores/tutorial";

export function OnboardingRedirector() {
  const router = useRouter();
  const pickerSeen = useTutorial((s) => s.pickerSeen);
  const hasSeenToday = useTutorial((s) => s.hasSeen.today);
  const hasSeenCreate = useTutorial((s) => s.hasSeen.createProgram);
  const dismissPicker = useTutorial((s) => s.dismissPicker);
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (pickerSeen) return;
    if (!hasSeenToday || !hasSeenCreate) return;
    fired.current = true;
    dismissPicker();
    router.push("/settings");
  }, [pickerSeen, hasSeenToday, hasSeenCreate, dismissPicker, router]);

  return null;
}
