"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const REST_DURATIONS = [60, 90, 120, 180] as const;
export type RestDuration = (typeof REST_DURATIONS)[number];

type RestTimerState = {
  defaultDuration: RestDuration;
  endsAt: number | null;
  setDefaultDuration: (d: RestDuration) => void;
  start: (durationSec?: number) => void;
  adjust: (deltaSec: number) => void;
  stop: () => void;
};

export const useRestTimer = create<RestTimerState>()(
  persist(
    (set, get) => ({
      defaultDuration: 90,
      endsAt: null,
      setDefaultDuration: (d) => set({ defaultDuration: d }),
      start: (durationSec) => {
        const dur = durationSec ?? get().defaultDuration;
        set({ endsAt: Date.now() + dur * 1000 });
      },
      adjust: (deltaSec) => {
        const current = get().endsAt;
        if (current === null) return;
        const next = current + deltaSec * 1000;
        set({ endsAt: next > Date.now() ? next : null });
      },
      stop: () => set({ endsAt: null }),
    }),
    {
      name: "rest-timer",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ defaultDuration: s.defaultDuration }),
    }
  )
);
