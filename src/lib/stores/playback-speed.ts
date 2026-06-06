"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// Last-chosen exercise-video playback speed, persisted so it carries across
// exercises and sessions (same pattern as the rest-timer store).
export const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
export type Speed = (typeof SPEEDS)[number];

type PlaybackSpeedState = {
  speed: number;
  setSpeed: (s: number) => void;
};

export const usePlaybackSpeed = create<PlaybackSpeedState>()(
  persist(
    (set) => ({
      speed: 1,
      setSpeed: (speed) => set({ speed }),
    }),
    {
      name: "playback-speed",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ speed: s.speed }),
    }
  )
);
