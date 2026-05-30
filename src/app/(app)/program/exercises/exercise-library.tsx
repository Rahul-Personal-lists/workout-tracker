"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExerciseAnimation } from "@/components/exercise-animation";
import { useDialog } from "@/lib/use-dialog";
import {
  type CatalogEntry,
  MUSCLE_GROUPS,
  imageForCatalogEntry,
  loadCatalog,
  getCachedCatalog,
} from "@/lib/exercise-catalog";

const RING =
  "outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]";

// No filters: a starter slice (the full catalog is ~800 entries, each with a
// remote image). With a search/muscle filter, show many more.
const BROWSE_LIMIT = 60;
const FILTERED_LIMIT = 200;

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ExerciseLibrary() {
  const [catalog, setCatalog] = useState<CatalogEntry[] | null>(
    getCachedCatalog()
  );
  const [query, setQuery] = useState("");
  const [activeMuscles, setActiveMuscles] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<CatalogEntry | null>(null);

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

  const hasFilters = query.trim() !== "" || activeMuscles.size > 0;

  const { items, total } = useMemo(() => {
    if (!catalog) return { items: [] as CatalogEntry[], total: 0 };
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const matchers = MUSCLE_GROUPS.filter((g) => activeMuscles.has(g.label));
    const matched = catalog.filter((e) => {
      if (tokens.length > 0) {
        const hay =
          `${e.name} ${e.equipment ?? ""} ${e.primary.join(" ")}`.toLowerCase();
        if (!tokens.every((t) => hay.includes(t))) return false;
      }
      if (matchers.length > 0 && !matchers.some((g) => g.match(e))) return false;
      return true;
    });
    const limit = hasFilters ? FILTERED_LIMIT : BROWSE_LIMIT;
    return { items: matched.slice(0, limit), total: matched.length };
  }, [catalog, query, activeMuscles, hasFilters]);

  function toggleMuscle(label: string) {
    setActiveMuscles((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  return (
    <div className="space-y-4">
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
            Muscle group
          </span>
          {activeMuscles.size > 0 ? (
            <button
              type="button"
              onClick={() => setActiveMuscles(new Set())}
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
          {MUSCLE_GROUPS.map((g) => {
            const on = activeMuscles.has(g.label);
            return (
              <button
                key={g.label}
                type="button"
                onClick={() => toggleMuscle(g.label)}
                aria-pressed={on}
                className={cn(
                  "h-8 px-3 rounded-full text-xs border transition-colors",
                  RING,
                  on
                    ? "bg-accent text-accent-foreground border-accent"
                    : "border-border bg-surface text-foreground-muted"
                )}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      </div>

      {catalog === null ? (
        <p className="text-sm text-foreground-muted">Loading catalog…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-foreground-muted">
          No exercises match. Try a different search or muscle group.
        </p>
      ) : (
        <>
          <ul className="space-y-2">
            {items.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => setSelected(entry)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-2xl border border-border bg-surface p-2.5 text-left",
                    RING
                  )}
                >
                  <ExerciseAnimation
                    url={imageForCatalogEntry(entry)}
                    alt={entry.name}
                    size={48}
                    shape="circle"
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium truncate">
                      {entry.name}
                    </span>
                    <span className="block text-[11px] text-foreground-muted truncate">
                      {entry.primary.map(titleCase).join(", ") ||
                        titleCase(entry.category)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
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
        <ExerciseDetail entry={selected} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  );
}

function ExerciseDetail({
  entry,
  onClose,
}: {
  entry: CatalogEntry;
  onClose: () => void;
}) {
  const ref = useDialog<HTMLDivElement>(true, onClose);
  const [size, setSize] = useState(288);

  useEffect(() => {
    const update = () => setSize(Math.min(320, window.innerWidth - 64));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const meta: [string, string | null][] = [
    ["Target", entry.primary.map(titleCase).join(", ") || null],
    ["Equipment", entry.equipment ? titleCase(entry.equipment) : null],
    ["Level", entry.level ? titleCase(entry.level) : null],
    ["Force", entry.force ? titleCase(entry.force) : null],
    ["Category", entry.category ? titleCase(entry.category) : null],
  ];

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
            "absolute top-2 right-2 h-9 w-9 rounded-full inline-flex items-center justify-center bg-black/40 text-foreground",
            RING
          )}
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex flex-col items-center gap-3">
          <ExerciseAnimation
            url={imageForCatalogEntry(entry)}
            alt={entry.name}
            size={size}
            shape="square"
          />
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
      </div>
    </div>
  );
}
