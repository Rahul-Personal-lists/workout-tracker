import { PRESET_PROGRAMS } from "@/lib/starter-program";
import { seedPresetProgram } from "@/app/actions/program";
import { PresetPreview } from "./preset-preview";

export function PresetList() {
  return (
    <ul className="space-y-2">
      {PRESET_PROGRAMS.map((p, i) => (
        <li
          key={p.id}
          data-tour={i === 0 ? "preset-templates" : undefined}
          className="rounded-lg border border-neutral-800 bg-neutral-900 p-3 space-y-2"
        >
          <div>
            <h2 className="text-sm font-medium">{p.name}</h2>
            <p className="text-[11px] text-neutral-500">
              {p.weeks} weeks · {p.days.length} days/week
              {p.deload_weeks.length
                ? ` · deloads ${p.deload_weeks.join(", ")}`
                : ""}
            </p>
            <p className="text-xs text-neutral-400 mt-1">{p.description}</p>
          </div>
          <PresetPreview preset={p} />
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
        </li>
      ))}
    </ul>
  );
}
