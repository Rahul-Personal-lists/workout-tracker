"use client";

// Tappable front/back anatomy figure for the body-map exercise browser (F1).
// Controlled: the parent owns the front/back view and the selected region.
// This is the only anatomy renderer that ships client JS — the heatmap/badge
// variants in body-figure.tsx stay universal.
import { cn } from "@/lib/utils";
import {
  BACK_MUSCLES,
  FRONT_MUSCLES,
  type AnatomyMuscle,
} from "@/lib/anatomy-data";
import { BASE_OPACITY } from "@/components/body-figure";
import {
  POLYGON_TO_REGION,
  REGION_TO_POLYGONS,
  regionLabel,
  type BodyView,
  type MuscleRegion,
} from "@/lib/muscle-regions";

const HIT_OPACITY = 0.95;
const FIGURE_HEIGHT = 240;

const PILL =
  "h-8 px-4 rounded-full text-xs border transition-colors outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]";

function basePolys(muscle: AnatomyMuscle) {
  return muscle.polygons.map((points, i) => (
    <polygon
      key={`base-${i}`}
      points={points}
      fill="var(--color-foreground-muted)"
      opacity={BASE_OPACITY}
      stroke="var(--color-background)"
      strokeWidth="0.35"
      strokeLinejoin="round"
    />
  ));
}

function accentPolys(muscle: AnatomyMuscle) {
  return muscle.polygons.map((points, i) => (
    <polygon
      key={`hit-${i}`}
      points={points}
      fill="var(--color-accent)"
      opacity={HIT_OPACITY}
    />
  ));
}

function InteractiveSide({
  muscles,
  selectedRegion,
  onSelect,
}: {
  muscles: AnatomyMuscle[];
  selectedRegion: MuscleRegion | null;
  onSelect: (region: MuscleRegion) => void;
}) {
  const selectedPolys = selectedRegion
    ? new Set(REGION_TO_POLYGONS[selectedRegion])
    : null;

  return (
    <g transform="translate(5 0)">
      {muscles.map((m) => {
        const region = POLYGON_TO_REGION[m.muscle];
        const highlighted = selectedPolys?.has(m.muscle) ?? false;
        const content = (
          <>
            {basePolys(m)}
            {highlighted ? accentPolys(m) : null}
          </>
        );
        // Head / knees etc. have no region — draw as inert silhouette.
        if (!region) return <g key={m.muscle}>{content}</g>;
        return (
          <g
            key={m.muscle}
            role="button"
            tabIndex={0}
            aria-label={regionLabel(region)}
            aria-pressed={highlighted}
            onClick={() => onSelect(region)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(region);
              }
            }}
            style={{ cursor: "pointer" }}
            className="region-hit"
          >
            {content}
          </g>
        );
      })}
    </g>
  );
}

export function InteractiveBodyFigure({
  activeView,
  onViewChange,
  onSelect,
  selectedRegion,
  className,
}: {
  activeView: BodyView;
  onViewChange: (view: BodyView) => void;
  onSelect: (region: MuscleRegion) => void;
  selectedRegion: MuscleRegion | null;
  className?: string;
}) {
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
      <svg
        viewBox="0 0 110 222"
        xmlns="http://www.w3.org/2000/svg"
        className="mx-auto w-auto"
        style={{ height: FIGURE_HEIGHT }}
        role="group"
        aria-label={`Tap a muscle to filter exercises (${activeView} view)`}
      >
        <InteractiveSide
          muscles={activeView === "front" ? FRONT_MUSCLES : BACK_MUSCLES}
          selectedRegion={selectedRegion}
          onSelect={onSelect}
        />
      </svg>
    </div>
  );
}
