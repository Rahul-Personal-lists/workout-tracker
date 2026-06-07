"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { useTutorial, type TourId } from "@/lib/stores/tutorial";
import { cn } from "@/lib/utils";

type Option = {
  tour: TourId;
  title: string;
  caption: string;
  route: string;
};

const OPTIONS: Option[] = [
  {
    tour: "today",
    title: "Get to know the app",
    caption: "5 steps · the app layout",
    route: "/program",
  },
  {
    tour: "createProgram",
    title: "Make your first program",
    caption: "7 steps · templates or build your own",
    route: "/program",
  },
];

export function OnboardingPicker() {
  const router = useRouter();
  const pathname = usePathname();
  const pickerSeen = useTutorial((s) => s.pickerSeen);
  const hasSeenToday = useTutorial((s) => s.hasSeen.today);
  const hasSeenCreate = useTutorial((s) => s.hasSeen.createProgram);
  const autoStartToday = useTutorial((s) => s.autoStart.today);
  const autoStartCreate = useTutorial((s) => s.autoStart.createProgram);
  const start = useTutorial((s) => s.start);
  const dismissPicker = useTutorial((s) => s.dismissPicker);

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    // Zustand-persist hydration gate; a lazy initializer would SSR-mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(useTutorial.persist.hasHydrated());
    return useTutorial.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  const open =
    hydrated &&
    !pickerSeen &&
    pathname === "/program" &&
    !autoStartToday &&
    !autoStartCreate;

  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) cardRef.current?.focus();
  }, [open]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        dismissPicker();
      }
    },
    [open, dismissPicker]
  );

  useEffect(() => {
    if (!open) return;
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, handleKey]);

  if (!open) return null;

  const completed: Record<TourId, boolean> = {
    today: hasSeenToday,
    createProgram: hasSeenCreate,
  };

  const handlePick = (opt: Option) => {
    start(opt.tour);
    if (opt.route !== pathname) router.push(opt.route);
  };

  return (
    <div
      className="fixed inset-0 z-[45] flex items-center justify-center px-4"
      aria-live="polite"
    >
      <div aria-hidden="true" className="absolute inset-0 bg-black/70" />
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-picker-title"
        tabIndex={-1}
        className={cn(
          "relative w-full max-w-sm rounded-xl border border-border bg-surface p-5 shadow-2xl outline-none animate-slide-down",
          "focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
        )}
      >
        <h2
          id="onboarding-picker-title"
          className="text-lg font-semibold text-foreground"
        >
          Welcome — pick a tour
        </h2>
        <p className="mt-1 text-sm text-foreground-muted">
          Two quick walkthroughs. Take either, both, or neither.
        </p>

        <ul className="mt-4 space-y-2">
          {OPTIONS.map((opt) => {
            const done = completed[opt.tour];
            return (
              <li key={opt.tour}>
                <button
                  type="button"
                  onClick={() => handlePick(opt)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-md border border-border bg-surface-subtle px-4 py-3 text-left transition hover:bg-surface-hover outline-none",
                    "focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
                  )}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">
                      {opt.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-foreground-muted">
                      {opt.caption}
                    </span>
                  </span>
                  {done ? (
                    <span
                      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent"
                      aria-label="Already completed"
                    >
                      <Check className="h-3 w-3" aria-hidden="true" />
                      Done
                    </span>
                  ) : (
                    <span
                      aria-hidden="true"
                      className="shrink-0 text-xs text-foreground-muted"
                    >
                      Start →
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => dismissPicker()}
            className={cn(
              "rounded-md px-3 py-1 text-xs text-foreground-muted hover:text-foreground outline-none",
              "focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
            )}
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
