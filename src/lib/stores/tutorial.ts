"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type TutorialState = {
  hasSeen: boolean;
  step: number;
  start: () => void;
  next: () => void;
  prev: () => void;
  goTo: (i: number) => void;
  finish: () => void;
  reset: () => void;
};

export const TOTAL_TUTORIAL_STEPS = 5;

export const useTutorial = create<TutorialState>()(
  persist(
    (set, get) => ({
      hasSeen: false,
      step: 0,
      start: () => set({ step: 0 }),
      next: () => {
        const s = get().step;
        if (s >= TOTAL_TUTORIAL_STEPS - 1) {
          set({ hasSeen: true, step: 0 });
          return;
        }
        set({ step: s + 1 });
      },
      prev: () => {
        const s = get().step;
        if (s <= 0) return;
        set({ step: s - 1 });
      },
      goTo: (i) =>
        set({ step: Math.max(0, Math.min(TOTAL_TUTORIAL_STEPS - 1, i)) }),
      finish: () => set({ hasSeen: true, step: 0 }),
      reset: () => set({ hasSeen: false, step: 0 }),
    }),
    {
      name: "tutorial",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // `step` is runtime-only; refresh mid-tour reopens at step 0.
      partialize: (s) => ({ hasSeen: s.hasSeen }),
    }
  )
);
