"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { useTutorial, TOTAL_TUTORIAL_STEPS } from "@/lib/stores/tutorial";
import { cn } from "@/lib/utils";

type Step = {
  target: string;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    target: "today-cta",
    title: "Start here",
    body: "Tap this to pick a program — that's the gate for everything else.",
  },
  {
    target: "nav-program",
    title: "Program",
    body: "Edit your weeks, days, and exercises. Swap presets anytime.",
  },
  {
    target: "nav-calendar",
    title: "Calendar",
    body: "Tap any past day to review the sets you logged.",
  },
  {
    target: "nav-body",
    title: "Body",
    body: "Log body weight and progress photos.",
  },
  {
    target: "nav-settings",
    title: "Settings",
    body: "Theme, display name, and sign out live here.",
  },
];

const SWIPE_COMMIT = 50;
const DRAG_START_THRESHOLD = 8;
const RING_PADDING = 10;

export function TutorialOverlay() {
  const pathname = usePathname();
  const hasSeen = useTutorial((s) => s.hasSeen);
  const step = useTutorial((s) => s.step);
  const next = useTutorial((s) => s.next);
  const prev = useTutorial((s) => s.prev);
  const finish = useTutorial((s) => s.finish);

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(useTutorial.persist.hasHydrated());
    return useTutorial.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  const onTour = hydrated && !hasSeen && pathname === "/today";

  const [rect, setRect] = useState<DOMRect | null>(null);
  const [viewport, setViewport] = useState<{ w: number; h: number } | null>(
    null
  );

  useLayoutEffect(() => {
    if (!onTour) return;
    setViewport({ w: window.innerWidth, h: window.innerHeight });
  }, [onTour]);

  useLayoutEffect(() => {
    if (!onTour) {
      setRect(null);
      return;
    }
    const selector = `[data-tour="${STEPS[step].target}"]`;
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) {
      setRect(null);
      return;
    }

    const update = () => {
      setRect(el.getBoundingClientRect());
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    };
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { capture: true, passive: true });

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, {
        capture: true,
      } as EventListenerOptions);
    };
  }, [onTour, step]);

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
      if (dx <= -SWIPE_COMMIT) next();
      else if (dx >= SWIPE_COMMIT) prev();
    }
    committed.current = "none";
    started.current = false;
  };

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (!onTour) return;
      if (e.key === "Escape") {
        e.preventDefault();
        finish();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
    },
    [onTour, finish, next, prev]
  );

  useEffect(() => {
    if (!onTour) return;
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onTour, handleKey]);

  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!onTour) return;
    cardRef.current?.focus();
  }, [onTour, step]);

  if (!onTour) return null;

  const last = step === TOTAL_TUTORIAL_STEPS - 1;
  const first = step === 0;
  const current = STEPS[step];

  // Where does the card sit? Pin top if the target is in the lower 45% of the
  // viewport (bottom-nav tabs); otherwise pin bottom.
  const v = viewport ?? {
    w: typeof window !== "undefined" ? window.innerWidth : 0,
    h: typeof window !== "undefined" ? window.innerHeight : 0,
  };
  const cardAtTop = rect ? rect.top > v.h * 0.55 : false;

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
  let arrow: { x1: number; y1: number; x2: number; y2: number } | null = null;
  if (rect) {
    const ringCx = rect.left + rect.width / 2;
    const ringTop = rect.top - RING_PADDING;
    const ringBottom = rect.bottom + RING_PADDING;
    // Card is roughly centered horizontally at v.w/2; tip at ring vertically.
    const cardCx = v.w / 2;
    if (cardAtTop) {
      // Card pinned to top → arrow goes from card bottom (~ 140px) down to the
      // top of the ring.
      arrow = {
        x1: cardCx,
        y1: 152,
        x2: ringCx,
        y2: ringTop - 4,
      };
    } else {
      // Card pinned to bottom → arrow goes from card top (~ v.h - 200) up to
      // the bottom of the ring.
      arrow = {
        x1: cardCx,
        y1: v.h - 220,
        x2: ringCx,
        y2: ringBottom + 4,
      };
    }
  }

  return (
    <div
      className="fixed inset-0 z-50"
      // Live region for screen-reader announcement of the current step.
      aria-live="polite"
    >
      {/* Click-catcher: blocks taps on everything except the card. */}
      <div className="absolute inset-0" aria-hidden="true" />

      {/* Spotlight ring + dimming via huge spread shadow. Fallback to a plain
       * dim backdrop when the target can't be found. */}
      {ringStyle ? (
        <div
          aria-hidden="true"
          style={ringStyle}
          className="animate-pulse-tour"
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-black/70"
        />
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
              id="tour-arrowhead"
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
            markerEnd="url(#tour-arrowhead)"
          />
        </svg>
      ) : null}

      {/* Instruction card. */}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-title"
        tabIndex={-1}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{ touchAction: "pan-y" }}
        className={cn(
          "fixed left-4 right-4 mx-auto max-w-sm rounded-xl border border-border bg-surface p-4 shadow-2xl outline-none animate-slide-down",
          "focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]",
          cardAtTop
            ? "top-[max(env(safe-area-inset-top),1rem)]"
            : "bottom-[max(env(safe-area-inset-bottom),1rem)]"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wide text-foreground-muted">
              Step {step + 1} of {TOTAL_TUTORIAL_STEPS}
            </div>
            <h2
              id="tutorial-title"
              className="mt-1 text-base font-semibold text-foreground"
            >
              {current.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={finish}
            className="-mr-1 -mt-1 shrink-0 rounded-md px-2 py-1 text-xs text-foreground-muted hover:text-foreground outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
            aria-label="Skip tutorial"
          >
            Skip
          </button>
        </div>
        <p className="mt-2 text-sm text-foreground-muted">{current.body}</p>

        <div className="mt-4 flex items-center justify-between">
          <div
            className="flex items-center gap-1.5"
            aria-hidden="true"
          >
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === step
                    ? "w-4 bg-accent"
                    : "w-1.5 bg-border-strong"
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prev}
              disabled={first}
              className="btn-secondary h-9 px-3 text-sm"
            >
              Back
            </button>
            <button
              type="button"
              onClick={next}
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
