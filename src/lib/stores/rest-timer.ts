"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const REST_DURATIONS = [30, 45, 60, 90, 120] as const;
export type RestDuration = (typeof REST_DURATIONS)[number];

type RestTimerState = {
  defaultDuration: RestDuration;
  endsAt: number | null;
  pausedAt: number | null;
  setDefaultDuration: (d: RestDuration) => void;
  start: (durationSec?: number) => void;
  adjust: (deltaSec: number) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
};

export const useRestTimer = create<RestTimerState>()(
  persist(
    (set, get) => ({
      defaultDuration: 45,
      endsAt: null,
      pausedAt: null,
      setDefaultDuration: (d) => set({ defaultDuration: d }),
      start: (durationSec) => {
        const dur = durationSec ?? get().defaultDuration;
        set({ endsAt: Date.now() + dur * 1000, pausedAt: null });
      },
      adjust: (deltaSec) => {
        const current = get().endsAt;
        if (current === null) return;
        const next = current + deltaSec * 1000;
        set({ endsAt: next > Date.now() ? next : null });
      },
      stop: () => set({ endsAt: null, pausedAt: null }),
      pause: () => {
        const { endsAt, pausedAt } = get();
        if (endsAt === null || pausedAt !== null) return;
        set({ pausedAt: Date.now() });
      },
      resume: () => {
        const { endsAt, pausedAt } = get();
        if (endsAt === null || pausedAt === null) return;
        const delta = Date.now() - pausedAt;
        set({ endsAt: endsAt + delta, pausedAt: null });
      },
    }),
    {
      name: "rest-timer",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      // Persist endsAt + pausedAt so the timer survives navigation (e.g. when
      // the workout is paused and the user goes to /program).
      partialize: (s) => ({
        defaultDuration: s.defaultDuration,
        endsAt: s.endsAt,
        pausedAt: s.pausedAt,
      }),
      migrate: (persisted, version) => {
        if (version < 2) {
          const p = (persisted ?? {}) as Partial<RestTimerState>;
          return {
            defaultDuration: p.defaultDuration ?? (45 as RestDuration),
            endsAt: null,
            pausedAt: null,
          };
        }
        return persisted as RestTimerState;
      },
    }
  )
);
