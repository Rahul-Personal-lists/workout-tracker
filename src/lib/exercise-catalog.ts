// Shared client-side access to the public-domain exercise catalog
// (public/data/exercises-catalog.json, sourced from yuhonas/free-exercise-db).
// Used by both the add-to-program flow and the read-only exercise library.

export type CatalogEntry = {
  id: string;
  name: string;
  equipment: string | null;
  category: string;
  force: string | null;
  level: string | null;
  primary: string[];
  custom?: boolean;
};

const REMOTE_IMG = (slug: string) =>
  `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${slug}/0.jpg`;

export const CUSTOM_IMG = "/icon-192.png";

export function imageForCatalogEntry(entry: CatalogEntry): string {
  return entry.custom ? CUSTOM_IMG : REMOTE_IMG(entry.id);
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
