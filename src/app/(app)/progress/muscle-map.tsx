import {
  TOP_LEVEL_GROUPS,
  muscleLabel,
  type TopLevelGroup,
} from "@/lib/muscle-groups";
import {
  BACK_MUSCLES,
  FRONT_MUSCLES,
  MUSCLE_TO_GROUP,
  type AnatomyMuscle,
} from "./anatomy-data";

const BASE_OPACITY = 0.18;
const MIN_HIT_OPACITY = 0.4;
const MAX_HIT_OPACITY = 1;

function intensity(count: number, max: number): number {
  if (max <= 0 || count <= 0) return 0;
  return MIN_HIT_OPACITY + (MAX_HIT_OPACITY - MIN_HIT_OPACITY) * (count / max);
}

function Figure({
  muscles,
  muscleSets,
  max,
  translateX,
  label,
}: {
  muscles: AnatomyMuscle[];
  muscleSets: Record<TopLevelGroup, number>;
  max: number;
  translateX: number;
  label: string;
}) {
  return (
    <g transform={`translate(${translateX} 0)`}>
      {/* Base body silhouette — every polygon at low opacity so unmapped parts
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
      {/* Accent overlay — only muscles in our taxonomy with logged sets. */}
      {muscles.map(({ muscle, polygons }) => {
        const group = MUSCLE_TO_GROUP[muscle];
        if (!group) return null;
        const op = intensity(muscleSets[group], max);
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
    </g>
  );
}

export function MuscleMap({
  muscleSets,
}: {
  muscleSets: Record<TopLevelGroup, number>;
}) {
  const max = Math.max(0, ...TOP_LEVEL_GROUPS.map((g) => muscleSets[g]));
  const top3 = TOP_LEVEL_GROUPS.map((g) => ({ g, count: muscleSets[g] }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Most trained regions</h3>
        {max === 0 ? (
          <span className="text-xs text-foreground-muted">no sets logged</span>
        ) : null}
      </div>

      <svg
        viewBox="0 0 220 240"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto"
        role="img"
        aria-label="Anatomical map highlighting most trained muscle groups"
      >
        <Figure
          muscles={FRONT_MUSCLES}
          muscleSets={muscleSets}
          max={max}
          translateX={5}
          label="FRONT"
        />
        <Figure
          muscles={BACK_MUSCLES}
          muscleSets={muscleSets}
          max={max}
          translateX={115}
          label="BACK"
        />
      </svg>

      {top3.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2 pt-1">
          {top3.map(({ g, count }) => (
            <li
              key={g}
              className="rounded-lg border border-border bg-surface-subtle px-2 py-1.5"
            >
              <div className="text-xs text-foreground-muted">
                {muscleLabel(g)}
              </div>
              <div className="text-sm font-medium tabular-nums">
                {count}{" "}
                <span className="text-foreground-muted text-xs">sets</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-foreground-muted">
          Log some sets to see which regions you&apos;ve hit.
        </p>
      )}
    </div>
  );
}
