// Universal anatomical-figure renderer (no "use client" — pure SVG, safe in both
// RSC and client trees). Two modes:
//   - "heatmap": the read-only /progress map, opacity keyed by the 8-group
//     TopLevelGroup taxonomy (behaviorally identical to the old inline <Figure>).
//   - "badge":   a compact figure highlighting a set of granular MuscleRegions.
// The interactive (tappable) variant for the body-map browser lives separately
// in interactive-body-figure.tsx (it needs "use client").
import {
  BACK_MUSCLES,
  FRONT_MUSCLES,
  MUSCLE_TO_GROUP,
  type AnatomyMuscle,
} from "@/lib/anatomy-data";
import type { TopLevelGroup } from "@/lib/muscle-groups";
import {
  REGION_TO_POLYGONS,
  type BodyView,
  type MuscleRegion,
} from "@/lib/muscle-regions";

export const BASE_OPACITY = 0.18;
const MIN_HIT_OPACITY = 0.4;
const MAX_HIT_OPACITY = 1;
const BADGE_OPACITY = 0.95;

// Aspect of a single side / both sides in the anatomy coordinate space.
export const FIGURE_ASPECT_SINGLE = 110 / 222;
export const FIGURE_ASPECT_BOTH = 220 / 222;

function intensity(count: number, max: number): number {
  if (max <= 0 || count <= 0) return 0;
  return MIN_HIT_OPACITY + (MAX_HIT_OPACITY - MIN_HIT_OPACITY) * (count / max);
}

function SideFigure({
  muscles,
  translateX,
  opacityFor,
  label,
}: {
  muscles: AnatomyMuscle[];
  translateX: number;
  opacityFor: (muscle: string) => number;
  label?: string;
}) {
  return (
    <g transform={`translate(${translateX} 0)`}>
      {/* Base silhouette — every polygon at low opacity so unmapped parts
       * (head/neck/knees) and unhit muscles still render the figure. */}
      {muscles.map(({ muscle, polygons }) =>
        polygons.map((points, i) => (
          <polygon
            key={`base-${muscle}-${i}`}
            points={points}
            fill="var(--color-foreground-muted)"
            opacity={BASE_OPACITY}
            stroke="var(--color-background)"
            strokeWidth="0.35"
            strokeLinejoin="round"
          />
        ))
      )}
      {/* Accent overlay. */}
      {muscles.map(({ muscle, polygons }) => {
        const op = opacityFor(muscle);
        if (op <= 0) return null;
        return polygons.map((points, i) => (
          <polygon
            key={`hit-${muscle}-${i}`}
            points={points}
            fill="var(--color-accent)"
            opacity={op}
          />
        ));
      })}
      {label ? (
        <text
          x={50}
          y={232}
          textAnchor="middle"
          fontSize="9"
          fill="var(--color-foreground-muted)"
          letterSpacing="1.5"
        >
          {label}
        </text>
      ) : null}
    </g>
  );
}

type BodyFigureProps = {
  view?: BodyView | "both";
  showLabels?: boolean;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
} & (
  | { mode: "heatmap"; muscleSets: Record<TopLevelGroup, number>; max: number }
  | { mode: "badge"; regions: MuscleRegion[] }
);

export function BodyFigure(props: BodyFigureProps) {
  const { view = "both", showLabels = false, className, style, ariaLabel } = props;

  const opacityFor =
    props.mode === "heatmap"
      ? (muscle: string) => {
          const g = MUSCLE_TO_GROUP[muscle];
          return g ? intensity(props.muscleSets[g], props.max) : 0;
        }
      : (() => {
          const hot = new Set<string>();
          for (const r of props.regions) {
            for (const p of REGION_TO_POLYGONS[r]) hot.add(p);
          }
          return (muscle: string) => (hot.has(muscle) ? BADGE_OPACITY : 0);
        })();

  const showBoth = view === "both";
  const height = showLabels ? 240 : 222;
  const viewBox = showBoth ? `0 0 220 ${height}` : `0 0 110 ${height}`;

  return (
    <svg
      viewBox={viewBox}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      {showBoth || view === "front" ? (
        <SideFigure
          muscles={FRONT_MUSCLES}
          translateX={5}
          opacityFor={opacityFor}
          label={showLabels ? "FRONT" : undefined}
        />
      ) : null}
      {showBoth || view === "back" ? (
        <SideFigure
          muscles={BACK_MUSCLES}
          translateX={showBoth ? 115 : 5}
          opacityFor={opacityFor}
          label={showLabels ? "BACK" : undefined}
        />
      ) : null}
    </svg>
  );
}
