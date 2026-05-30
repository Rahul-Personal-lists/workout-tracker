"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// A single active time-attack countdown (you do one timed set at a time, like
// the rest timer). Persisted to localStorage so the countdown survives
// navigation/unmount: on remount the owning row resumes it, or completes the
// set if it already expired while away (so the log isn't lost). The key is
// session-scoped (`${sessionId}:${programExerciseId}:${setNumber}`) so a timer
// left running in one session can't auto-complete a set in a later session that
// reuses the same program exercise.
type TimeSetTimerState = {
  setKey: string | null;
  endsAt: number | null; // epoch ms
  targetSec: number | null;
  start: (setKey: string, targetSec: number) => void;
  stop: () => void;
};

export const useTimeSetTimer = create<TimeSetTimerState>()(
  persist(
    (set) => ({
      setKey: null,
      endsAt: null,
      targetSec: null,
      start: (setKey, targetSec) =>
        set({ setKey, targetSec, endsAt: Date.now() + targetSec * 1000 }),
      stop: () => set({ setKey: null, endsAt: null, targetSec: null }),
    }),
    {
      name: "time-set-timer",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        setKey: s.setKey,
        endsAt: s.endsAt,
        targetSec: s.targetSec,
      }),
    }
  )
);
