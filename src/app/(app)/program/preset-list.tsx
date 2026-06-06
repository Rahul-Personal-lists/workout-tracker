import Image from "next/image";
import { cn } from "@/lib/utils";
import { PRESET_PROGRAMS } from "@/lib/starter-program";
import { GOAL_META, getLibraryProgram } from "@/lib/program-library";
import { seedPresetProgram } from "@/app/actions/program";
import { PresetPreview } from "./preset-preview";

// The quick-picker is a curated "quick start" subset — the original 4 presets.
// The full (16-program) catalog lives behind the "Browse the library" link
// so this list doesn't balloon. Keep in sync with the original PRESET_PROGRAMS.
const QUICK_PICK_IDS = new Set([
  "starter-12wk",
  "ppl-6wk",
  "upper-lower-8wk",
  "full-body-3x-6wk",
]);

export function PresetList({ weightLb }: { weightLb: number }) {
  const quickPicks = PRESET_PROGRAMS.filter((p) => QUICK_PICK_IDS.has(p.id));
  return (
    <ul className="space-y-3">
      {quickPicks.map((p, i) => {
        const lib = getLibraryProgram(p.id);
        const goal = lib ? GOAL_META[lib.goal] : null;
        // Days/week = training days only (the array also holds a rest day).
        const trainingDays = p.days.filter((d) => d.exercises.length > 0).length;
        return (
          <li
            key={p.id}
            data-tour={i === 0 ? "preset-templates" : undefined}
            className="rounded-lg border border-neutral-800 bg-neutral-900 overflow-hidden"
          >
            {lib ? (
              <div className="relative aspect-[5/2] w-full">
                <Image
                  src={lib.heroImage}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 768px"
                  className="object-cover object-[center_20%]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3 space-y-0.5">
                  {goal ? (
                    <p
                      className={cn(
                        "text-[11px] font-semibold uppercase tracking-wide",
                        goal.color,
                      )}
                    >
                      {goal.label}
                    </p>
                  ) : null}
                  <h2 className="text-base font-semibold text-white leading-tight">
                    {p.name}
                  </h2>
                </div>
              </div>
            ) : null}
            <div className="p-3 space-y-2">
              <div>
                {lib ? null : <h2 className="text-sm font-medium">{p.name}</h2>}
                <p className="text-[11px] text-neutral-500">
                  {p.weeks} weeks · {trainingDays} days/week
                  {p.deload_weeks.length
                    ? ` · deloads ${p.deload_weeks.join(", ")}`
                    : ""}
                </p>
                <p className="text-xs text-neutral-400 mt-1">{p.description}</p>
              </div>
              <PresetPreview preset={p} weightLb={weightLb} />
              <form
                action={async () => {
                  "use server";
                  await seedPresetProgram({ presetId: p.id });
                }}
              >
                <button type="submit" className="btn-primary w-full h-10 text-xs">
                  Use this program
                </button>
              </form>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
