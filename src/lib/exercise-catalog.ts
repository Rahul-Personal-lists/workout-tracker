// Shared client-side access to the public-domain exercise catalog
// (public/data/exercises-catalog.json, sourced from yuhonas/free-exercise-db).
// Used by both the add-to-program flow and the read-only exercise library.

import type { ReframeRect, TrimBounds } from "@/lib/video-upload";

// A user's custom-exercise clip, carried on the catalog entry so the add flow
// can preview it and snapshot it onto the program_exercises row.
export type CatalogVideo = {
  customExerciseId: string;
  videoPath: string;
  posterPath: string;
  videoUrl: string;
  posterUrl: string;
  rect: ReframeRect | null;
  trim: TrimBounds | null;
  aspect: number | null;
};

export type CatalogEntry = {
  id: string;
  name: string;
  equipment: string | null;
  category: string;
  force: string | null;
  level: string | null;
  primary: string[];
  custom?: boolean;
  // Signed poster URL used as the thumbnail for custom entries.
  posterUrl?: string;
  // Durable storage path for the poster (NOT the expiring signed URL) — the
  // add-to-program flow snapshots this for photo-only customs.
  posterPath?: string;
  video?: CatalogVideo;
};

const REMOTE_IMG = (slug: string) =>
  `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${slug}/0.jpg`;

export const CUSTOM_IMG = "/icon-192.png";

export function imageForCatalogEntry(entry: CatalogEntry): string {
  if (entry.posterUrl) return entry.posterUrl;
  return entry.custom ? CUSTOM_IMG : REMOTE_IMG(entry.id);
}

// Map a custom_exercises library row (shape from getCustomExercises) into a
// CatalogEntry so it merges into the add-exercise search. Structural param so
// this client module doesn't import the server-only queries types.
export function customToCatalogEntry(c: {
  id: string;
  name: string;
  muscles: string[];
  video_path: string | null;
  poster_path: string;
  video_signed_url: string | null;
  poster_signed_url: string | null;
  crop_rect: ReframeRect | null;
  trim: TrimBounds | null;
  aspect_ratio: number | null;
}): CatalogEntry {
  return {
    id: c.id,
    name: c.name,
    equipment: null,
    category: "custom",
    force: null,
    level: null,
    primary: c.muscles,
    custom: true,
    posterUrl: c.poster_signed_url || undefined,
    posterPath: c.poster_path,
    video: c.video_signed_url
      ? {
          customExerciseId: c.id,
          videoPath: c.video_path as string,
          posterPath: c.poster_path,
          videoUrl: c.video_signed_url,
          posterUrl: c.poster_signed_url ?? "",
          rect: c.crop_rect,
          trim: c.trim,
          aspect: c.aspect_ratio,
        }
      : undefined,
  };
}

export const MUSCLE_GROUPS: {
  label: string;
  match: (e: CatalogEntry) => boolean;
}[] = [
  { label: "Abs", match: (e) => e.primary.includes("abdominals") },
  {
    label: "Arms",
    match: (e) =>
      e.primary.some((m) => ["biceps", "triceps", "forearms"].includes(m)),
  },
  {
    label: "Back",
    match: (e) =>
      e.primary.some((m) =>
        ["lats", "lower back", "middle back", "traps"].includes(m)
      ),
  },
  { label: "Calves", match: (e) => e.primary.includes("calves") },
  { label: "Cardio", match: (e) => e.category === "cardio" },
  { label: "Chest", match: (e) => e.primary.includes("chest") },
  {
    label: "Legs",
    match: (e) =>
      e.primary.some((m) =>
        ["quadriceps", "hamstrings", "glutes", "adductors", "abductors"].includes(
          m
        )
      ),
  },
  {
    label: "Shoulders",
    match: (e) => e.primary.some((m) => ["shoulders", "neck"].includes(m)),
  },
];

// Module-level cache: the catalog is a static JSON, so fetch + parse it once
// per session instead of on every mount of a screen that uses it.
let catalogCache: CatalogEntry[] | null = null;
let catalogPromise: Promise<CatalogEntry[]> | null = null;

export function getCachedCatalog(): CatalogEntry[] | null {
  return catalogCache;
}

export function loadCatalog(): Promise<CatalogEntry[]> {
  if (catalogCache) return Promise.resolve(catalogCache);
  if (!catalogPromise) {
    catalogPromise = fetch("/data/exercises-catalog.json")
      .then((r) => r.json())
      .then((d: CatalogEntry[]) => {
        catalogCache = d;
        return d;
      })
      .catch(() => {
        catalogPromise = null; // let a later mount retry
        return [] as CatalogEntry[];
      });
  }
  return catalogPromise;
}
