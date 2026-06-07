"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Dumbbell, Search, Star, X } from "lucide-react";
import { cn, FOCUS_RING as RING } from "@/lib/utils";
import { ExerciseAnimation } from "@/components/exercise-animation";
import { VideoExercisePlayer } from "@/components/video-exercise-player";
import { InteractiveBodyFigure } from "@/components/interactive-body-figure";
import { MuscleBadge } from "@/components/muscle-badge";
import { useDialog } from "@/lib/use-dialog";
import { toggleFavorite } from "@/app/actions/favorites";
import {
  deleteCustomExercise,
  signCustomVideoUrl,
} from "@/app/actions/custom-exercise";
import { toast } from "@/components/toast";
import type { VideoMedia } from "@/lib/video-upload";
import {
  MUSCLE_REGIONS,
  REGION_META,
  regionsFromCatalogMuscles,
  type BodyView,
  type MuscleRegion,
} from "@/lib/muscle-regions";
import {
  type CatalogEntry,
  imageForCatalogEntry,
  loadCatalog,
  getCachedCatalog,
} from "@/lib/exercise-catalog";

// No filters: a starter slice (the full catalog is ~800 entries, each with a
// remote image). With a search/muscle filter, show many more.
const BROWSE_LIMIT = 60;
const FILTERED_LIMIT = 200;

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

// Filter pills: Cardio + every granular muscle. A common subset shows by default;
// the rest hide behind "Show more" so the row stays short.
const FILTER_PILLS: { key: string; label: string }[] = [
  { key: "cardio", label: "Cardio" },
  ...MUSCLE_REGIONS.map((r) => ({ key: r.key as string, label: r.label })),
];
const PRIMARY_PILL_KEYS = new Set([
  "cardio",
  "chest",
  "shoulders",
  "biceps",
  "triceps",
  "abs",
  "lats",
  "glutes",
  "quads",
]);
const PRIMARY_PILLS = FILTER_PILLS.filter((p) => PRIMARY_PILL_KEYS.has(p.key));
const MORE_PILLS = FILTER_PILLS.filter((p) => !PRIMARY_PILL_KEYS.has(p.key));

export function ExerciseLibrary({
  initialFavorites = [],
  initialRegion,
  initialCustom = [],
}: {
  initialFavorites?: string[];
  initialRegion?: MuscleRegion;
  initialCustom?: CatalogEntry[];
}) {
  const [catalog, setCatalog] = useState<CatalogEntry[] | null>(
    getCachedCatalog()
  );
  // The user's custom exercises, kept in state so the detail modal can
  // optimistically drop one after a delete.
  const [customs, setCustoms] = useState<CatalogEntry[]>(initialCustom);
  const [query, setQuery] = useState("");
  // Single active filter key: one MuscleRegion or "cardio" (or null). Shared by
  // the body-map callouts and the pill row — selecting one clears the previous.
  const [activeKey, setActiveKey] = useState<string | null>(
    initialRegion ?? null
  );
  const [showAllFilters, setShowAllFilters] = useState(false);
  const [view, setView] = useState<BodyView>(() =>
    initialRegion && REGION_META[initialRegion].view === "back"
      ? "back"
      : "front"
  );
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [customOnly, setCustomOnly] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(
    () => new Set(initialFavorites)
  );
  const [selected, setSelected] = useState<CatalogEntry | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (catalog) return;
    let cancelled = false;
    loadCatalog().then((d) => {
      if (!cancelled) setCatalog(d);
    });
    return () => {
      cancelled = true;
    };
  }, [catalog]);

  const hasFilters =
    query.trim() !== "" || activeKey !== null || favoritesOnly || customOnly;

  const { items, total } = useMemo(() => {
    // Customs lead the list so they surface first in browse, and show even
    // before the remote catalog JSON finishes loading.
    const source = [...customs, ...(catalog ?? [])];
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const regionKey =
      activeKey && activeKey !== "cardio" ? (activeKey as MuscleRegion) : null;
    const cardioActive = activeKey === "cardio";
    const matched = source.filter((e) => {
      if (favoritesOnly && !favorites.has(e.id)) return false;
      if (customOnly && !e.custom) return false;
      if (tokens.length > 0) {
        const hay =
          `${e.name} ${e.equipment ?? ""} ${e.primary.join(" ")}`.toLowerCase();
        if (!tokens.every((t) => hay.includes(t))) return false;
      }
      if (activeKey) {
        const matchCardio = cardioActive && e.category === "cardio";
        const matchRegion =
          regionKey !== null &&
          regionsFromCatalogMuscles(e.primary).includes(regionKey);
        if (!matchCardio && !matchRegion) return false;
      }
      return true;
    });
    const limit = hasFilters ? FILTERED_LIMIT : BROWSE_LIMIT;
    return { items: matched.slice(0, limit), total: matched.length };
  }, [
    catalog,
    customs,
    query,
    activeKey,
    favoritesOnly,
    customOnly,
    favorites,
    hasFilters,
  ]);

  // Single-select: tapping the active key clears it, otherwise it replaces the
  // previous selection. Shared by the body-map callouts and the pills.
  function toggleKey(key: string) {
    setActiveKey((prev) => (prev === key ? null : key));
  }

  function clearFilters() {
    setActiveKey(null);
  }

  const renderPill = (p: { key: string; label: string }) => {
    const on = activeKey === p.key;
    return (
      <button
        key={p.key}
        type="button"
        onClick={() => toggleKey(p.key)}
        aria-pressed={on}
        className={cn(
          "h-8 px-3 rounded-full text-xs border transition-colors",
          RING,
          on
            ? "bg-accent text-accent-foreground border-accent"
            : "border-border bg-surface text-foreground-muted"
        )}
      >
        {p.label}
      </button>
    );
  };

  function onToggleFav(entry: CatalogEntry) {
    const slug = entry.id;
    const wasFav = favorites.has(slug);
    const apply = (add: boolean) =>
      setFavorites((prev) => {
        const next = new Set(prev);
        if (add) next.add(slug);
        else next.delete(slug);
        return next;
      });
    apply(!wasFav); // optimistic
    startTransition(async () => {
      try {
        const { favorited } = await toggleFavorite({ slug });
        apply(favorited); // reconcile with server truth
      } catch {
        apply(wasFav); // revert
        toast("Couldn't update favorite — try again.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-4">
        <InteractiveBodyFigure
          activeView={view}
          onViewChange={setView}
          activeKey={activeKey}
          onSelect={toggleKey}
        />
        <p className="mt-1 text-center text-[11px] text-foreground-muted">
          Tap a muscle to filter — or pick from the list below.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search exercises…"
          aria-label="Search exercises"
          className={cn(
            "w-full h-12 rounded-md bg-surface border border-border pl-9 pr-3 text-base",
            RING
          )}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wide text-foreground-muted">
            Filter
          </span>
          {activeKey !== null ? (
            <button
              type="button"
              onClick={clearFilters}
              className={cn(
                "text-[11px] text-foreground-muted inline-flex items-center gap-1 rounded",
                RING
              )}
            >
              <X className="w-3 h-3" /> Clear
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFavoritesOnly((v) => !v)}
            aria-pressed={favoritesOnly}
            className={cn(
              "h-8 px-3 rounded-full text-xs border transition-colors inline-flex items-center gap-1",
              RING,
              favoritesOnly
                ? "bg-accent text-accent-foreground border-accent"
                : "border-border bg-surface text-foreground-muted"
            )}
          >
            <Star className={cn("w-3.5 h-3.5", favoritesOnly && "fill-current")} />
            Favorites
          </button>
          <button
            type="button"
            onClick={() => setCustomOnly((v) => !v)}
            aria-pressed={customOnly}
            className={cn(
              "h-8 px-3 rounded-full text-xs border transition-colors inline-flex items-center gap-1",
              RING,
              customOnly
                ? "bg-accent text-accent-foreground border-accent"
                : "border-border bg-surface text-foreground-muted"
            )}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            Custom
          </button>
          {PRIMARY_PILLS.map(renderPill)}
          {(showAllFilters
            ? MORE_PILLS
            : MORE_PILLS.filter((p) => p.key === activeKey)
          ).map(renderPill)}
          <button
            type="button"
            onClick={() => setShowAllFilters((v) => !v)}
            aria-expanded={showAllFilters}
            className={cn(
              "h-8 px-3 rounded-full text-xs border border-dashed border-border bg-surface text-foreground-muted",
              RING
            )}
          >
            {showAllFilters ? "Show less" : `Show more (${MORE_PILLS.length})`}
          </button>
        </div>
      </div>

      {catalog === null && !customOnly ? (
        <p className="text-sm text-foreground-muted">Loading catalog…</p>
      ) : items.length === 0 ? (
        customOnly && customs.length === 0 ? (
          <p className="text-sm text-foreground-muted">
            No custom exercises yet — tap New to create one from a video.
          </p>
        ) : favoritesOnly && favorites.size === 0 ? (
          <p className="text-sm text-foreground-muted">
            No favorites yet — tap the star on any exercise to save it.
          </p>
        ) : (
          <p className="text-sm text-foreground-muted">
            No exercises match. Try a different search or filter.
          </p>
        )
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-3">
            {items.map((entry) => {
              const fav = favorites.has(entry.id);
              const regions = regionsFromCatalogMuscles(entry.primary);
              return (
                <li key={entry.id} className="relative">
                  <button
                    type="button"
                    onClick={() => setSelected(entry)}
                    className={cn(
                      "w-full overflow-hidden rounded-2xl border border-border bg-surface text-left",
                      RING
                    )}
                  >
                    <span className="relative block aspect-square w-full">
                      <ExerciseAnimation
                        url={imageForCatalogEntry(entry)}
                        alt={entry.name}
                        fill
                        className="!rounded-none !border-0"
                      />
                      {regions.length > 0 ? (
                        <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/45 backdrop-blur-sm p-1">
                          <MuscleBadge regions={regions} size={22} />
                        </span>
                      ) : null}
                    </span>
                    <span className="block p-2.5">
                      <span className="block text-sm font-medium truncate">
                        {entry.name}
                      </span>
                      <span className="block text-[11px] text-foreground-muted truncate">
                        {entry.primary.map(titleCase).join(", ") ||
                          titleCase(entry.category)}
                      </span>
                    </span>
                  </button>
                  {!entry.custom ? (
                    <button
                      type="button"
                      onClick={() => onToggleFav(entry)}
                      aria-pressed={fav}
                      aria-label={
                        fav
                          ? `Remove ${entry.name} from favorites`
                          : `Add ${entry.name} to favorites`
                      }
                      className={cn(
                        "absolute top-2 right-2 h-9 w-9 inline-flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm",
                        RING
                      )}
                    >
                      <Star
                        className={cn(
                          "w-4 h-4",
                          fav ? "fill-current text-accent" : "text-white"
                        )}
                      />
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {total > items.length ? (
            <p className="text-center text-[11px] text-foreground-muted">
              Showing {items.length} of {total} — refine your search to narrow it
              down.
            </p>
          ) : null}
        </>
      )}

      {selected ? (
        <ExerciseDetail
          entry={selected}
          onClose={() => setSelected(null)}
          onRemoved={(id) => {
            setCustoms((prev) => prev.filter((c) => c.id !== id));
            setSelected(null);
          }}
        />
      ) : null}
    </div>
  );
}

function ExerciseDetail({
  entry,
  onClose,
  onRemoved,
}: {
  entry: CatalogEntry;
  onClose: () => void;
  onRemoved: (id: string) => void;
}) {
  const ref = useDialog<HTMLDivElement>(true, onClose);
  const [size, setSize] = useState(288);
  const [confirming, setConfirming] = useState(false);
  const [, startDelete] = useTransition();

  useEffect(() => {
    const update = () => setSize(Math.min(320, window.innerWidth - 64));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const video = entry.video;
  const meta: [string, string | null][] = [
    ["Target", entry.primary.map(titleCase).join(", ") || null],
    ["Equipment", entry.equipment ? titleCase(entry.equipment) : null],
    ["Level", entry.level ? titleCase(entry.level) : null],
    ["Force", entry.force ? titleCase(entry.force) : null],
    ["Category", entry.category ? titleCase(entry.category) : null],
  ];

  function remove() {
    if (!video) return;
    const id = video.customExerciseId;
    startDelete(async () => {
      try {
        await deleteCustomExercise({ id });
        onRemoved(id);
      } catch {
        setConfirming(false);
        toast("Couldn't remove — try again.");
      }
    });
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={entry.name}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-surface p-4 outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className={cn(
            "absolute top-2 right-2 z-10 h-9 w-9 rounded-full inline-flex items-center justify-center bg-black/40 text-foreground",
            RING
          )}
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex flex-col items-center gap-3">
          {video ? (
            <VideoExercisePlayer
              media={
                {
                  videoUrl: video.videoUrl,
                  posterUrl: video.posterUrl || null,
                  rect: video.rect,
                  trim: video.trim,
                  aspect: video.aspect,
                } satisfies VideoMedia
              }
              alt={entry.name}
              onNeedsRefresh={() =>
                signCustomVideoUrl({ path: video.videoPath })
              }
            />
          ) : (
            <ExerciseAnimation
              url={imageForCatalogEntry(entry)}
              alt={entry.name}
              size={size}
              shape="square"
            />
          )}
          <h2 className="text-base font-semibold text-center px-6">
            {entry.name}
          </h2>
        </div>
        <dl className="mt-4 space-y-1.5 text-sm">
          {meta
            .filter((m): m is [string, string] => m[1] !== null)
            .map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="w-24 shrink-0 text-foreground-muted">{k}</dt>
                <dd className="flex-1">{v}</dd>
              </div>
            ))}
        </dl>
        {video ? (
          confirming ? (
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={remove}
                className={cn(
                  "h-10 flex-1 rounded-md bg-red-500/15 text-red-400 text-sm font-medium",
                  RING
                )}
              >
                Remove custom exercise
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className={cn(
                  "h-10 px-4 rounded-md border border-border text-sm text-foreground-muted",
                  RING
                )}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className={cn(
                "mt-4 h-10 w-full rounded-md border border-border text-sm text-foreground-muted hover:text-foreground",
                RING
              )}
            >
              Remove
            </button>
          )
        ) : null}
      </div>
    </div>
  );
}
