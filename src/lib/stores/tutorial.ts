"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type TourId = "today" | "createProgram";

export const TUTORIAL_STEP_COUNT: Record<TourId, number> = {
  today: 5,
  createProgram: 6,
};

type TutorialState = {
  hasSeen: Record<TourId, boolean>;
  step: Record<TourId, number>;
  start: (id: TourId) => void;
  next: (id: TourId) => void;
  prev: (id: TourId) => void;
  goTo: (id: TourId, i: number) => void;
  finish: (id: TourId) => void;
  reset: (id: TourId) => void;
  resetAll: () => void;
};

const initialHasSeen: Record<TourId, boolean> = {
  today: false,
  createProgram: false,
};
const initialStep: Record<TourId, number> = {
  today: 0,
  createProgram: 0,
};

export const useTutorial = create<TutorialState>()(
  persist(
    (set, get) => ({
      hasSeen: initialHasSeen,
      step: initialStep,
      start: (id) =>
        set((s) => ({ step: { ...s.step, [id]: 0 } })),
      next: (id) => {
        const cur = get().step[id];
        const max = TUTORIAL_STEP_COUNT[id] - 1;
        if (cur >= max) {
          set((s) => ({
            hasSeen: { ...s.hasSeen, [id]: true },
            step: { ...s.step, [id]: 0 },
          }));
          return;
        }
        set((s) => ({ step: { ...s.step, [id]: cur + 1 } }));
      },
      prev: (id) => {
        const cur = get().step[id];
        if (cur <= 0) return;
        set((s) => ({ step: { ...s.step, [id]: cur - 1 } }));
      },
      goTo: (id, i) =>
        set((s) => ({
          step: {
            ...s.step,
            [id]: Math.max(0, Math.min(TUTORIAL_STEP_COUNT[id] - 1, i)),
          },
        })),
      finish: (id) =>
        set((s) => ({
          hasSeen: { ...s.hasSeen, [id]: true },
          step: { ...s.step, [id]: 0 },
        })),
      reset: (id) =>
        set((s) => ({
          hasSeen: { ...s.hasSeen, [id]: false },
          step: { ...s.step, [id]: 0 },
        })),
      resetAll: () =>
        set({ hasSeen: initialHasSeen, step: initialStep }),
    }),
    {
      name: "tutorial",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      // `step` is runtime-only; refresh mid-tour reopens at step 0.
      partialize: (s) => ({ hasSeen: s.hasSeen }),
      migrate: (persisted, version) => {
        if (version < 2) {
          // v1 had a flat boolean for the single /today tour.
          const old = (persisted ?? {}) as { hasSeen?: boolean };
          return {
            hasSeen: {
              today: old.hasSeen ?? false,
              createProgram: false,
            },
          };
        }
        return persisted as { hasSeen: Record<TourId, boolean> };
      },
    }
  )
);
