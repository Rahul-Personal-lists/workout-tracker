import {
  TOP_LEVEL_GROUPS,
  muscleLabel,
  type TopLevelGroup,
} from "@/lib/muscle-groups";
import { BodyFigure } from "@/components/body-figure";

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

      <BodyFigure
        mode="heatmap"
        view="both"
        muscleSets={muscleSets}
        max={max}
        showLabels
        className="w-full h-auto"
        ariaLabel="Anatomical map highlighting most trained muscle groups"
      />

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
