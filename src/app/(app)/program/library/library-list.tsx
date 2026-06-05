"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDialog } from "@/lib/use-dialog";
import {
  GOAL_META,
  SPLIT_LABEL,
  getLibraryPrograms,
  type Experience,
  type GymLocation,
  type LibraryProgram,
} from "@/lib/program-library";

const RING =
  "outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]";

const GYM_OPTIONS: { value: GymLocation | null; label: string }[] = [
  { value: null, label: "All gyms" },
  { value: "commercial", label: "Commercial" },
  { value: "small_home", label: "Small & Home" },
];

const EXPERIENCE_OPTIONS: { value: Experience | null; label: string }[] = [
  { value: null, label: "All levels" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate_advanced", label: "Intermediate & Advanced" },
];

type SheetKey = "gym" | "experience" | null;

export function LibraryList() {
  const [gym, setGym] = useState<GymLocation | null>(null);
  const [experience, setExperience] = useState<Experience | null>(null);
  const [sheet, setSheet] = useState<SheetKey>(null);

  const sections = getLibraryPrograms({
    gymLocation: gym ?? undefined,
    experience: experience ?? undefined,
  });

  const gymLabel = GYM_OPTIONS.find((o) => o.value === gym)?.label;
  const expLabel = EXPERIENCE_OPTIONS.find((o) => o.value === experience)?.label;
  const anyFilter = gym !== null || experience !== null;
  const clearAll = () => {
    setGym(null);
    setExperience(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <FilterPill
          label={gym !== null ? gymLabel! : "Gym Location"}
          active={gym !== null}
          onClick={() => setSheet("gym")}
        />
        <FilterPill
          label={experience !== null ? expLabel! : "Experience"}
          active={experience !== null}
          onClick={() => setSheet("experience")}
        />
        {anyFilter ? (
          <button
            type="button"
            onClick={clearAll}
            className={cn(
              "inline-flex items-center gap-1 text-xs text-foreground-muted rounded",
              RING,
            )}
          >
            <X className="w-3 h-3" /> Clear
          </button>
        ) : null}
      </div>

      {sections.length === 0 ? (
        <p className="text-sm text-foreground-muted">
          No programs match these filters.{" "}
          <button
            type="button"
            onClick={clearAll}
            className={cn("underline", RING)}
          >
            Clear filters
          </button>
        </p>
      ) : (
        sections.map((section) => (
          <section key={section.daysPerWeek} className="space-y-2.5">
            <h2 className="text-base font-semibold text-foreground">
              {section.daysPerWeek} Days a Week
            </h2>
            <ul className="space-y-3">
              {section.programs.map((p) => (
                <LibraryCard key={p.id} program={p} />
              ))}
            </ul>
          </section>
        ))
      )}

      <FilterSheet
        open={sheet === "gym"}
        title="Gym Location"
        options={GYM_OPTIONS}
        value={gym}
        onSelect={setGym}
        onClose={() => setSheet(null)}
      />
      <FilterSheet
        open={sheet === "experience"}
        title="Gym Experience"
        options={EXPERIENCE_OPTIONS}
        value={experience}
        onSelect={setExperience}
        onClose={() => setSheet(null)}
      />
    </div>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      className={cn(
        "h-9 px-3 inline-flex items-center gap-1.5 rounded-full text-xs border transition-colors",
        RING,
        active
          ? "border-accent bg-accent/10 text-foreground"
          : "border-border bg-surface text-foreground-muted",
      )}
    >
      {label}
      <ChevronDown className="w-3.5 h-3.5" />
    </button>
  );
}

function LibraryCard({ program }: { program: LibraryProgram }) {
  const goal = GOAL_META[program.goal];
  return (
    <li>
      <Link
        href={`/program/library/${program.id}`}
        className={cn(
          "group block relative overflow-hidden rounded-2xl border border-border",
          RING,
        )}
      >
        <div className="relative aspect-[3/2] w-full">
          <Image
            src={program.heroImage}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        </div>
        <div className="absolute inset-x-0 bottom-0 p-4 space-y-0.5">
          <p
            className={cn(
              "text-[11px] font-semibold uppercase tracking-wide",
              goal.color,
            )}
          >
            {goal.label}
          </p>
          <h3 className="text-lg font-semibold text-white leading-tight">
            {program.name}
          </h3>
          <p className="text-xs text-white/70">
            {SPLIT_LABEL[program.split]} · {program.weeks} weeks
          </p>
        </div>
      </Link>
    </li>
  );
}

function FilterSheet<T extends string>({
  open,
  title,
  options,
  value,
  onSelect,
  onClose,
}: {
  open: boolean;
  title: string;
  options: { value: T | null; label: string }[];
  value: T | null;
  onSelect: (v: T | null) => void;
  onClose: () => void;
}) {
  const ref = useDialog<HTMLDivElement>(open, onClose);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-surface border-t border-border rounded-t-xl px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] space-y-3 outline-none"
      >
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <ul role="radiogroup" aria-label={title} className="space-y-1.5">
          {options.map((o) => {
            const on = o.value === value;
            return (
              <li key={o.label}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => {
                    onSelect(o.value);
                    onClose();
                  }}
                  className={cn(
                    "w-full h-12 px-4 rounded-md text-sm flex items-center justify-between border transition-colors",
                    RING,
                    on
                      ? "border-accent bg-accent/10 text-foreground"
                      : "border-border text-foreground-muted hover:bg-surface-hover",
                  )}
                >
                  <span>{o.label}</span>
                  {on ? <Check className="w-4 h-4 text-accent" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
