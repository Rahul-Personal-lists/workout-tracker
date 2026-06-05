"use client";

// Tappable front/back anatomy figure for the body-map exercise browser (F1).
// Renders the body photo from public/body/ with reference-style labeled callouts:
// an accent dot on each muscle and a dashed leader line out to a label sitting in
// the photo's own dark side-margin (the person is centred, so the sides are empty),
// plus a Cardio heart. Selection is single: tapping a callout sets the one active
// filter key (shared with the pill row); tapping it again clears it.
//
// The SVG overlay shares the image's exact box (container aspect == image aspect),
// so dots stay aligned. The photos are already dark, so NO invert.
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  regionLabel,
  type BodyView,
  type MuscleRegion,
} from "@/lib/muscle-regions";

const IMG: Record<BodyView, { src: string; w: number; h: number }> = {
  front: { src: "/body/front.png", w: 941, h: 1372 },
  back: { src: "/body/back.png", w: 843, h: 1270 },
};

// Label anchors live just inside the photo's empty side margins.
const LEFT_LABEL_PCT = 27;
const RIGHT_LABEL_PCT = 73;
const SLOT_TOP = 13;
const SLOT_BOTTOM = 87;

type CalloutKey = MuscleRegion | "cardio";
type Callout = { key: CalloutKey; x: number; y: number }; // x,y as % of the image

const LAYOUT: Record<BodyView, { left: Callout[]; right: Callout[] }> = {
  front: {
    left: [
      { key: "shoulders", x: 34, y: 19 },
      { key: "chest", x: 44, y: 25 },
      { key: "forearms", x: 33, y: 39 },
      { key: "quads", x: 43, y: 64 },
      { key: "calves", x: 44, y: 85 },
    ],
    right: [
      { key: "cardio", x: 56, y: 24 },
      { key: "biceps", x: 67, y: 30 },
      { key: "abs", x: 50, y: 38 },
      { key: "adductors", x: 50, y: 55 },
    ],
  },
  back: {
    left: [
      { key: "shoulders", x: 34, y: 20 },
      { key: "lats", x: 40, y: 29 },
      { key: "forearms", x: 33, y: 39 },
      { key: "hamstrings", x: 44, y: 64 },
      { key: "calves", x: 44, y: 85 },
    ],
    right: [
      { key: "cardio", x: 57, y: 24 },
      { key: "traps", x: 50, y: 18 },
      { key: "triceps", x: 68, y: 30 },
      { key: "lower_back", x: 50, y: 40 },
      { key: "glutes", x: 50, y: 50 },
    ],
  },
};

const PILL =
  "h-8 px-4 rounded-full text-xs border transition-colors outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]";

function labelFor(key: CalloutKey) {
  return key === "cardio" ? "Cardio" : regionLabel(key);
}

function slotYPct(index: number, count: number) {
  if (count <= 1) return (SLOT_TOP + SLOT_BOTTOM) / 2;
  return SLOT_TOP + ((SLOT_BOTTOM - SLOT_TOP) * index) / (count - 1);
}

export function InteractiveBodyFigure({
  activeView,
  onViewChange,
  activeKey,
  onSelect,
  className,
}: {
  activeView: BodyView;
  onViewChange: (view: BodyView) => void;
  activeKey: string | null;
  onSelect: (key: CalloutKey) => void;
  className?: string;
}) {
  const { left, right } = LAYOUT[activeView];
  const img = IMG[activeView];
  const vx = (pct: number) => (pct / 100) * img.w;
  const vy = (pct: number) => (pct / 100) * img.h;

  function Callout({
    c,
    index,
    count,
    side,
  }: {
    c: Callout;
    index: number;
    count: number;
    side: "left" | "right";
  }) {
    const labelX = vx(side === "left" ? LEFT_LABEL_PCT : RIGHT_LABEL_PCT);
    const labelY = vy(slotYPct(index, count));
    const cx = vx(c.x);
    const cy = vy(c.y);
    const active = c.key === activeKey;

    const padX = vx(24);
    const hitX = side === "left" ? Math.max(0, labelX - padX) : cx;
    const hitW = side === "left" ? cx - hitX : labelX + padX - cx;
    const hitY = Math.min(labelY, cy) - vy(5.5);
    const hitH = Math.abs(labelY - cy) + vy(11);

    return (
      <g
        className="region-callout"
        role="button"
        tabIndex={0}
        aria-pressed={active}
        aria-label={labelFor(c.key)}
        onClick={() => onSelect(c.key)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(c.key);
          }
        }}
      >
        <rect x={hitX} y={hitY} width={hitW} height={hitH} fill="transparent" />
        <line
          x1={labelX}
          y1={labelY}
          x2={cx}
          y2={cy}
          stroke={active ? "var(--color-accent)" : "var(--color-foreground-muted)"}
          strokeWidth={3}
          strokeDasharray="9 7"
        />
        {c.key === "cardio" ? (
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={vy(4)}
            fill="var(--color-accent)"
          >
            ♥
          </text>
        ) : (
          <circle
            cx={cx}
            cy={cy}
            r={active ? vy(1.5) : vy(1.1)}
            fill="var(--color-accent)"
            stroke={active ? "#fff" : "none"}
            strokeWidth={active ? vy(0.4) : 0}
          />
        )}
        <text
          x={labelX}
          y={labelY}
          textAnchor={side === "left" ? "end" : "start"}
          dominantBaseline="central"
          fontSize={vy(2.6)}
          fontWeight={active ? 700 : 500}
          fill={active ? "var(--color-accent)" : "#fff"}
          stroke="rgba(0,0,0,0.55)"
          strokeWidth={vy(0.12)}
          paintOrder="stroke"
        >
          {labelFor(c.key)}
        </text>
      </g>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-center gap-1.5">
        {(["front", "back"] as const).map((v) => {
          const on = activeView === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onViewChange(v)}
              aria-pressed={on}
              className={cn(
                PILL,
                on
                  ? "bg-accent text-accent-foreground border-accent"
                  : "border-border bg-surface text-foreground-muted"
              )}
            >
              {v === "front" ? "Front" : "Back"}
            </button>
          );
        })}
      </div>

      <div
        className="relative mx-auto w-full overflow-hidden rounded-xl"
        style={{ aspectRatio: `${img.w} / ${img.h}`, maxWidth: 360 }}
      >
        <Image
          src={img.src}
          alt={`${activeView === "front" ? "Front" : "Back"} body`}
          fill
          sizes="(max-width: 480px) 80vw, 360px"
          priority
          draggable={false}
          className="object-cover select-none pointer-events-none"
        />
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${img.w} ${img.h}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {left.map((c, i) => (
            <Callout key={`l-${c.key}`} c={c} index={i} count={left.length} side="left" />
          ))}
          {right.map((c, i) => (
            <Callout key={`r-${c.key}`} c={c} index={i} count={right.length} side="right" />
          ))}
        </svg>
      </div>
    </div>
  );
}
