"use client";

import { useEffect, useRef } from "react";

/** null = off, 0 = at step end, 5 = 5 seconds before step end */
export type StepLead = 0 | 5 | null;

export function normalizeStepLead(value: number | null): StepLead {
  if (value === 0) return 0;
  if (value === 5) return 5;
  return null;
}

export function cueFireAt(endsAt: number, lead: StepLead): number | null {
  if (lead === null) return null;
  return endsAt - lead * 1000;
}

let audioCtx: AudioContext | null = null;

/**
 * On a user gesture: resume the shared AudioContext (required on mobile) and
 * prime the Vibration API. Chrome on Android only honours navigator.vibrate
 * once the page has a user activation, so calling it here — a no-op vibrate(0)
 * inside the gesture — gives the later timer-driven step cue the best chance of
 * firing. This can't override an OS-level silent/haptics policy: if the device
 * itself suppresses haptics, no web call will buzz.
 */
export function unlockStepCues(): void {
  if (typeof window === "undefined") return;
  const Ctx =
    window.AudioContext ??
    (
      window as unknown as {
        webkitAudioContext?: typeof AudioContext;
      }
    ).webkitAudioContext;
  if (Ctx) {
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === "suspended") {
      void audioCtx.resume();
    }
  }
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate?.(0);
  }
}

export function playStepBeep(): void {
  if (typeof window === "undefined") return;
  const ctx = audioCtx;
  if (!ctx || ctx.state !== "running") return;

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.type = "sine";
  oscillator.frequency.value = 880;
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.15);
}

// navigator.vibrate is Android-only; iOS Safari does not implement it.
export function fireStepVibration(): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate?.([300, 120, 300]);
  }
}

// Short single pulse for a manual set-completion tap (distinct from the
// step-end cue pattern above).
export function tapVibration(): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate?.(15);
  }
}

export function useStepCues({
  endsAt,
  soundLead,
  vibrationLead,
  now,
  paused = false,
}: {
  endsAt: number | null;
  soundLead: StepLead;
  vibrationLead: StepLead;
  now: number;
  paused?: boolean;
}): void {
  const soundFired = useRef(false);
  const vibrationFired = useRef(false);

  useEffect(() => {
    soundFired.current = false;
    vibrationFired.current = false;
  }, [endsAt]);

  useEffect(() => {
    if (endsAt === null || paused) return;

    const soundAt = cueFireAt(endsAt, soundLead);
    if (soundAt !== null && !soundFired.current && now >= soundAt) {
      soundFired.current = true;
      playStepBeep();
    }

    const vibrationAt = cueFireAt(endsAt, vibrationLead);
    if (vibrationAt !== null && !vibrationFired.current && now >= vibrationAt) {
      vibrationFired.current = true;
      fireStepVibration();
    }
  }, [endsAt, soundLead, vibrationLead, now, paused]);
}
