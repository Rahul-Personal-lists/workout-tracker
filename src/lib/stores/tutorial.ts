"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type TourId = "today" | "createProgram" | "addExercise";

export const TUTORIAL_STEP_COUNT: Record<TourId, number> = {
  today: 5,
  createProgram: 7,
  addExercise: 2,
};

type TutorialState = {
  pickerSeen: boolean;
  hasSeen: Record<TourId, boolean>;
  autoStart: Record<TourId, boolean>;
  step: Record<TourId, number>;
  start: (id: TourId) => void;
  next: (id: TourId) => void;
  prev: (id: TourId) => void;
  goTo: (id: TourId, i: number) => void;
  finish: (id: TourId) => void;
  replayTour: (id: TourId) => void;
  dismissPicker: () => void;
};

const initialHasSeen: Record<TourId, boolean> = {
  today: false,
  createProgram: false,
  addExercise: false,
};
const initialAutoStart: Record<TourId, boolean> = {
  today: false,
  createProgram: false,
  addExercise: false,
};
const initialStep: Record<TourId, number> = {
  today: 0,
  createProgram: 0,
  addExercise: 0,
};

export const useTutorial = create<TutorialState>()(
  persist(
    (set, get) => ({
      pickerSeen: false,
      hasSeen: initialHasSeen,
      autoStart: initialAutoStart,
      step: initialStep,
      start: (id) =>
        set((s) => ({
          step: { ...s.step, [id]: 0 },
          autoStart: { ...s.autoStart, [id]: true },
        })),
      next: (id) => {
        const cur = get().step[id];
        const max = TUTORIAL_STEP_COUNT[id] - 1;
        if (cur >= max) {
          set((s) => ({
            hasSeen: { ...s.hasSeen, [id]: true },
            autoStart: { ...s.autoStart, [id]: false },
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
          autoStart: { ...s.autoStart, [id]: false },
          step: { ...s.step, [id]: 0 },
        })),
      replayTour: (id) =>
        set((s) => ({
          hasSeen: { ...s.hasSeen, [id]: false },
          autoStart: { ...s.autoStart, [id]: true },
          step: { ...s.step, [id]: 0 },
        })),
      dismissPicker: () => set({ pickerSeen: true }),
    }),
    {
      name: "tutorial",
      version: 3,
      storage: createJSONStorage(() => localStorage),
      // `step` and `autoStart` are runtime-only: a mid-tour reload reopens at
      // step 0 and never resurrects an unwanted auto-fire.
      partialize: (s) => ({
        pickerSeen: s.pickerSeen,
        hasSeen: s.hasSeen,
      }),
      migrate: (persisted, version) => {
        if (version < 2) {
          // v1 had a flat boolean for the single /today tour.
          const old = (persisted ?? {}) as { hasSeen?: boolean };
          const hasSeen = {
            today: old.hasSeen ?? false,
            createProgram: false,
            addExercise: false,
          };
          return {
            pickerSeen: hasSeen.today && hasSeen.createProgram,
            hasSeen,
          };
        }
        if (version < 3) {
          // v2 had hasSeen but no pickerSeen. Don't disrupt users who already
          // saw both tours; show the picker to everyone else.
          const old = (persisted ?? {}) as {
            hasSeen?: Record<TourId, boolean>;
          };
          const hasSeen = { ...initialHasSeen, ...old.hasSeen };
          return {
            pickerSeen: !!(hasSeen.today && hasSeen.createProgram),
            hasSeen,
          };
        }
        return persisted as {
          pickerSeen: boolean;
          hasSeen: Record<TourId, boolean>;
        };
      },
    }
  )
);
