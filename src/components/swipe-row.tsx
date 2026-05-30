"use client";

import { type ReactNode, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const ACTION_WIDTH = 88;
const REVEAL_THRESHOLD = 32;
const DRAG_START_THRESHOLD = 8;

type Tone = "destructive" | "neutral";

type Props = {
  onAction: () => void;
  actionLabel: string;
  actionIcon?: ReactNode;
  actionTone?: Tone;
  className?: string;
  children: ReactNode;
};

export function SwipeRow({
  onAction,
  actionLabel,
  actionIcon,
  actionTone = "destructive",
  className,
  children,
}: Props) {
  const [dx, setDx] = useState(0);
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const committed = useRef<"none" | "horizontal" | "vertical">("none");
  const started = useRef(false);
  const suppressClick = useRef(false);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    committed.current = "none";
    started.current = true;
    // Self-contained gesture: prevent ancestor SwipeRows (e.g. the exercise
    // card wrapping a set row) from also tracking this pointer.
    e.stopPropagation();
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!started.current) return;
    if (committed.current === "vertical") return;
    const totalDx = e.clientX - startX.current;
    const totalDy = e.clientY - startY.current;

    if (committed.current === "none") {
      if (
        Math.abs(totalDx) < DRAG_START_THRESHOLD &&
        Math.abs(totalDy) < DRAG_START_THRESHOLD
      ) {
        return;
      }
      if (Math.abs(totalDy) > Math.abs(totalDx)) {
        committed.current = "vertical";
        return;
      }
      committed.current = "horizontal";
      e.currentTarget.setPointerCapture?.(e.pointerId);
      setDragging(true);
    }

    if (committed.current === "horizontal") {
      const base = open ? -ACTION_WIDTH : 0;
      const next = Math.min(0, Math.max(-ACTION_WIDTH, base + totalDx));
      setDx(next);
    }
  }

  function endDrag() {
    if (committed.current === "horizontal") {
      const shouldOpen = dx <= -REVEAL_THRESHOLD;
      setOpen(shouldOpen);
      setDx(shouldOpen ? -ACTION_WIDTH : 0);
      suppressClick.current = true;
    }
    setDragging(false);
    committed.current = "none";
    started.current = false;
  }

  function onClickCapture(e: React.MouseEvent<HTMLDivElement>) {
    if (suppressClick.current) {
      suppressClick.current = false;
      e.preventDefault();
      e.stopPropagation();
    }
  }

  function handleAction() {
    setOpen(false);
    setDx(0);
    onAction();
  }

  function collapse() {
    setOpen(false);
    setDx(0);
  }

  const toneClass =
    actionTone === "destructive"
      ? "bg-red-600 text-white"
      : "bg-neutral-700 text-white";

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <button
        type="button"
        onClick={handleAction}
        // Keyboard affordance: the action is otherwise only revealed by a pointer
        // swipe. It's always tab-reachable (sits behind the row content when
        // closed); focusing it slides the row open so the focus ring is visible,
        // and blurring collapses it again.
        onFocus={() => {
          setOpen(true);
          setDx(-ACTION_WIDTH);
        }}
        onBlur={collapse}
        aria-label={actionLabel}
        style={{ width: ACTION_WIDTH }}
        className={cn(
          "absolute inset-y-0 right-0 flex items-center justify-center gap-1.5 text-xs font-medium transition-opacity",
          "outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]",
          // Hidden (but still focusable, unlike `invisible`/visibility:hidden)
          // when closed, so it doesn't bleed through translucent row content
          // (e.g. a completed set's bg-accent/10). Focus/swipe reveals it.
          !open && !dragging && "opacity-0",
          toneClass
        )}
      >
        {actionIcon}
        {actionLabel}
      </button>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
        style={{
          transform: `translateX(${dx}px)`,
          transition: dragging ? "none" : "transform 150ms ease",
          touchAction: "pan-y",
        }}
        className="relative"
      >
        {children}
        {open ? (
          <div
            aria-hidden
            onClick={collapse}
            className="absolute inset-0 z-10"
          />
        ) : null}
      </div>
    </div>
  );
}
