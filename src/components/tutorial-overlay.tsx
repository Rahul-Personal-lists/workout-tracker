"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  useTutorial,
  TUTORIAL_STEP_COUNT,
  type TourId,
} from "@/lib/stores/tutorial";
import { cn } from "@/lib/utils";

type Step = {
  target: string;
  route: string;
  title: string;
  body: string;
};

const TOUR_STEPS: Record<TourId, Step[]> = {
  today: [
    {
      target: "today-cta",
      route: "/program",
      title: "Start here",
      body: "Tap to begin today's workout — everything else is optional.",
    },
    {
      target: "nav-program",
      route: "/program",
      title: "Program",
      body: "Browse every day in your plan. Tap the pencil to edit exercises.",
    },
    {
      target: "nav-progress",
      route: "/program",
      title: "Progress",
      body: "Stats, charts, and a calendar of every workout you've logged.",
    },
    {
      target: "nav-body",
      route: "/program",
      title: "Body",
      body: "Log body weight and progress photos.",
    },
    {
      target: "nav-settings",
      route: "/program",
      title: "Settings",
      body: "Theme, display name, and sign out live here.",
    },
  ],
  createProgram: [
    {
      target: "preset-templates",
      route: "/program",
      title: "Use a template",
      body: "Fastest start — tap 'Use this program' on one of these and you're training today. These are just quick picks; the full library (below) has the whole catalog — grouped by days per week, filterable by gym and experience.",
    },
    {
      target: "open-new-program",
      route: "/program",
      title: "Or build your own",
      body: "Want full control? Tap 'Create blank program' to start from scratch — we'll walk you through it next.",
    },
    {
      target: "np-name",
      route: "/program/new/custom",
      title: "Name it",
      body: "Pick a label you'll recognize. You can rename it later.",
    },
    {
      target: "np-weeks",
      route: "/program/new/custom",
      title: "How long?",
      body: "Total block length, 1–52 weeks. Eight is a solid default.",
    },
    {
      target: "np-deloads",
      route: "/program/new/custom",
      title: "Deload weeks",
      body: "Optional — tap any week to mark it a deload (70% of normal load).",
    },
    {
      target: "np-days",
      route: "/program/new/custom",
      title: "Days",
      body: "One row per training day. The title is what shows on Today.",
    },
    {
      target: "np-create",
      route: "/program/new/custom",
      title: "Create",
      body: "Tap Create to save. You can edit days and exercises after.",
    },
  ],
};

const SWIPE_COMMIT = 50;
const DRAG_START_THRESHOLD = 8;
const RING_PADDING = 10;
const TARGET_RETRY_INTERVAL_MS = 80;
const TARGET_RETRY_TIMEOUT_MS = 2000;
const CARD_SAFE_MARGIN = 16;
const CARD_TO_RING_GAP = 28;

export function TutorialOverlay({ tour }: { tour: TourId }) {
  const router = useRouter();
  const pathname = usePathname();
  const autoStart = useTutorial((s) => s.autoStart[tour]);
  const step = useTutorial((s) => s.step[tour]);
  const nextStep = useTutorial((s) => s.next);
  const prevStep = useTutorial((s) => s.prev);
  const finish = useTutorial((s) => s.finish);

  const steps = TOUR_STEPS[tour];
  const stepCount = TUTORIAL_STEP_COUNT[tour];

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    // Zustand-persist hydration gate; a lazy initializer would SSR-mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(useTutorial.persist.hasHydrated());
    return useTutorial.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  const tourRoutes = useMemo(
    () => new Set(steps.map((s) => s.route)),
    [steps]
  );

  // Render while the user is on any route used by this tour, so brief
  // in-tour navigations (e.g. /program → /program/new) don't unmount us.
  const onTour = hydrated && autoStart && tourRoutes.has(pathname);

  const [rect, setRect] = useState<DOMRect | null>(null);
  const [viewport, setViewport] = useState<{ w: number; h: number } | null>(
    null
  );

  useLayoutEffect(() => {
    if (!onTour) return;
    // Measuring the viewport then setting state is the purpose of this layout effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setViewport({ w: window.innerWidth, h: window.innerHeight });
  }, [onTour]);

  useLayoutEffect(() => {
    if (!onTour) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRect(null);
      return;
    }
    const current = steps[step];
    // If the user is on a tour route but it doesn't match this step's route
    // (mid-transition), don't try to find a target.
    if (pathname !== current.route) {
      setRect(null);
      return;
    }
    const selector = `[data-tour="${current.target}"]`;

    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    let ro: ResizeObserver | null = null;
    let cleanup: (() => void) | null = null;

    const attach = (el: HTMLElement) => {
      const update = () => {
        setRect(el.getBoundingClientRect());
        setViewport({ w: window.innerWidth, h: window.innerHeight });
      };
      update();
      ro = new ResizeObserver(update);
      ro.observe(el);
      window.addEventListener("resize", update);
      window.addEventListener("scroll", update, {
        capture: true,
        passive: true,
      });
      cleanup = () => {
        ro?.disconnect();
        window.removeEventListener("resize", update);
        window.removeEventListener("scroll", update, {
          capture: true,
        } as EventListenerOptions);
      };
    };

    const initial = document.querySelector<HTMLElement>(selector);
    if (initial) {
      attach(initial);
    } else {
      setRect(null);
      const startedAt = Date.now();
      interval = setInterval(() => {
        if (cancelled) return;
        const el = document.querySelector<HTMLElement>(selector);
        if (el) {
          if (interval) clearInterval(interval);
          interval = null;
          attach(el);
        } else if (Date.now() - startedAt > TARGET_RETRY_TIMEOUT_MS) {
          if (interval) clearInterval(interval);
          interval = null;
          if (process.env.NODE_ENV !== "production") {
            console.warn(`[tutorial] tour target not found: ${selector}`);
          }
        }
      }, TARGET_RETRY_INTERVAL_MS);
    }

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      cleanup?.();
    };
  }, [onTour, step, pathname, steps]);

  const handleAdvance = useCallback(() => {
    const nxt = steps[step + 1];
    nextStep(tour);
    if (nxt && nxt.route !== pathname) {
      router.push(nxt.route);
    }
  }, [nextStep, pathname, router, step, steps, tour]);

  const handleBack = useCallback(() => {
    const prv = steps[step - 1];
    prevStep(tour);
    if (prv && prv.route !== pathname) {
      router.push(prv.route);
    }
  }, [pathname, prevStep, router, step, steps, tour]);

  // Pointer-based swipe on the card.
  const startX = useRef(0);
  const startY = useRef(0);
  const committed = useRef<"none" | "horizontal" | "vertical">("none");
  const started = useRef(false);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    committed.current = "none";
    started.current = true;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!started.current || committed.current === "vertical") return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    if (committed.current === "none") {
      if (
        Math.abs(dx) < DRAG_START_THRESHOLD &&
        Math.abs(dy) < DRAG_START_THRESHOLD
      ) {
        return;
      }
      if (Math.abs(dy) > Math.abs(dx)) {
        committed.current = "vertical";
        return;
      }
      committed.current = "horizontal";
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (committed.current === "horizontal") {
      const dx = e.clientX - startX.current;
      if (dx <= -SWIPE_COMMIT) handleAdvance();
      else if (dx >= SWIPE_COMMIT) handleBack();
    }
    committed.current = "none";
    started.current = false;
  };

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (!onTour) return;
      if (e.key === "Escape") {
        e.preventDefault();
        finish(tour);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleAdvance();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleBack();
      }
    },
    [onTour, finish, handleAdvance, handleBack, tour]
  );

  useEffect(() => {
    if (!onTour) return;
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onTour, handleKey]);

  const cardRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState(0);

  useLayoutEffect(() => {
    if (!onTour || !cardRef.current) return;
    const node = cardRef.current;
    const update = () => setCardHeight(node.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, [onTour, step]);

  useEffect(() => {
    if (!onTour) return;
    cardRef.current?.focus();
  }, [onTour, step]);

  if (!onTour) return null;

  const last = step === stepCount - 1;
  const first = step === 0;
  const current = steps[step];

  // Where does the card sit? Pin top if the target is in the lower 45% of the
  // viewport (bottom-nav tabs); otherwise pin bottom.
  const v = viewport ?? {
    w: typeof window !== "undefined" ? window.innerWidth : 0,
    h: typeof window !== "undefined" ? window.innerHeight : 0,
  };
  const cardAtTop = rect ? rect.top > v.h * 0.55 : false;

  // Sit the card near the spotlight (above or below by CARD_TO_RING_GAP), so
  // the arrow stays short regardless of where the target is in the viewport.
  // When we don't have a rect yet, leave cardTop null and fall back to the
  // CSS safe-area positioning on the card.
  let cardTop: number | null = null;
  if (rect && cardHeight) {
    const desired = cardAtTop
      ? rect.top - CARD_TO_RING_GAP - cardHeight
      : rect.bottom + CARD_TO_RING_GAP;
    cardTop = Math.max(
      CARD_SAFE_MARGIN,
      Math.min(desired, v.h - cardHeight - CARD_SAFE_MARGIN)
    );
  }

  // Ring geometry.
  let ringStyle: React.CSSProperties | null = null;
  if (rect) {
    ringStyle = {
      position: "fixed",
      top: rect.top - RING_PADDING,
      left: rect.left - RING_PADDING,
      width: rect.width + RING_PADDING * 2,
      height: rect.height + RING_PADDING * 2,
      borderRadius: 9999,
      pointerEvents: "none",
    };
  }

  // Arrow from the card's near edge midpoint to the ring's far edge midpoint.
  // Since the card is positioned next to the target, this is naturally short.
  let arrow: { x1: number; y1: number; x2: number; y2: number } | null = null;
  if (rect && cardTop !== null) {
    const ringCx = rect.left + rect.width / 2;
    const ringTop = rect.top - RING_PADDING;
    const ringBottom = rect.bottom + RING_PADDING;
    const cardCx = v.w / 2;
    if (cardAtTop) {
      arrow = {
        x1: cardCx,
        y1: cardTop + cardHeight + 4,
        x2: ringCx,
        y2: ringTop - 4,
      };
    } else {
      arrow = {
        x1: cardCx,
        y1: cardTop - 4,
        x2: ringCx,
        y2: ringBottom + 4,
      };
    }
  }

  return (
    <div className="fixed inset-0 z-50" aria-live="polite">
      {/* Click-catcher: a full-screen scrim (the overlay is z-50, above the app)
          that swallows taps so background controls — e.g. the bottom nav — can't
          be hit mid-tour and desync it. The card is a later sibling, so it stays
          interactive. */}
      <div
        className="absolute inset-0"
        aria-hidden="true"
        onPointerDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      />

      {/* Spotlight ring + dimming via huge spread shadow. Fallback to a plain
       * dim backdrop when the target can't be found. */}
      {ringStyle ? (
        <div
          aria-hidden="true"
          style={ringStyle}
          className="animate-pulse-tour"
        />
      ) : (
        <div aria-hidden="true" className="absolute inset-0 bg-black/70" />
      )}

      {/* Arrow from card to ring. */}
      {arrow && viewport ? (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 text-accent"
          width={v.w}
          height={v.h}
          viewBox={`0 0 ${v.w} ${v.h}`}
        >
          <defs>
            <marker
              id={`tour-arrowhead-${tour}`}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
            </marker>
          </defs>
          <line
            x1={arrow.x1}
            y1={arrow.y1}
            x2={arrow.x2}
            y2={arrow.y2}
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            markerEnd={`url(#tour-arrowhead-${tour})`}
          />
        </svg>
      ) : null}

      {/* Instruction card. */}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`tutorial-title-${tour}`}
        tabIndex={-1}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{
          touchAction: "pan-y",
          ...(cardTop !== null ? { top: `${cardTop}px` } : {}),
        }}
        className={cn(
          "fixed left-4 right-4 mx-auto max-w-sm rounded-xl border border-border bg-surface p-4 shadow-2xl outline-none animate-slide-down",
          "focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]",
          // Fallback only when we don't have a measured rect yet.
          cardTop === null &&
            (cardAtTop
              ? "top-[max(env(safe-area-inset-top),1rem)]"
              : "bottom-[max(env(safe-area-inset-bottom),1rem)]")
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wide text-foreground-muted">
              Step {step + 1} of {stepCount}
            </div>
            <h2
              id={`tutorial-title-${tour}`}
              className="mt-1 text-base font-semibold text-foreground"
            >
              {current.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => finish(tour)}
            className="-mr-1 -mt-1 shrink-0 rounded-md px-2 py-1 text-xs text-foreground-muted hover:text-foreground outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
            aria-label="Skip tutorial"
          >
            Skip
          </button>
        </div>
        <p className="mt-2 text-sm text-foreground-muted">{current.body}</p>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {steps.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === step ? "w-4 bg-accent" : "w-1.5 bg-border-strong"
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBack}
              disabled={first}
              className="btn-secondary h-9 px-3 text-sm"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleAdvance}
              className="btn-primary h-9 px-3 text-sm"
            >
              {last ? "Done" : "Next"}
            </button>
          </div>
        </div>

        <p className="mt-2 text-center text-[11px] text-foreground-muted">
          Swipe to navigate
        </p>
      </div>
    </div>
  );
}
