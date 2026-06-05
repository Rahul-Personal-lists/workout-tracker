// A compact body-silhouette icon that highlights an exercise's target muscle
// region(s). Universal (no "use client") and JSON-free: it takes pre-resolved
// `regions`, so callers holding a CatalogEntry use regionsFromCatalogMuscles()
// and RSC callers use getMuscleRegionsForExercise() — neither pulls the catalog
// JSON into a client bundle. Empty `regions` renders a plain silhouette.
import {
  BodyFigure,
  FIGURE_ASPECT_BOTH,
  FIGURE_ASPECT_SINGLE,
} from "@/components/body-figure";
import {
  viewsForRegions,
  type BodyView,
  type MuscleRegion,
} from "@/lib/muscle-regions";

export function MuscleBadge({
  regions,
  view = "auto",
  size = 28,
  className,
  ariaLabel,
}: {
  regions: MuscleRegion[];
  view?: BodyView | "both" | "auto";
  // Rendered HEIGHT in px; width follows the figure aspect.
  size?: number;
  className?: string;
  ariaLabel?: string;
}) {
  let resolved: BodyView | "both";
  if (view === "auto") {
    const { front, back } = viewsForRegions(regions);
    resolved = front && back ? "both" : back ? "back" : "front";
  } else {
    resolved = view;
  }

  const width =
    size * (resolved === "both" ? FIGURE_ASPECT_BOTH : FIGURE_ASPECT_SINGLE);

  return (
    <BodyFigure
      mode="badge"
      regions={regions}
      view={resolved}
      className={className}
      style={{ height: size, width }}
      ariaLabel={ariaLabel}
    />
  );
}
