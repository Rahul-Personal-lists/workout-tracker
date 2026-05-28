import { Activity, Clock, Dumbbell, Repeat, Weight } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import type { ProgressTotals } from "@/lib/queries";

type Card = {
  id: keyof ProgressTotals;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  format: (v: number) => { value: string; suffix?: string };
};

const CARDS: Card[] = [
  {
    id: "workouts",
    label: "Workouts",
    Icon: Dumbbell,
    format: (v) => ({ value: v.toLocaleString() }),
  },
  {
    id: "exercises",
    label: "Exercises",
    Icon: Activity,
    format: (v) => ({ value: v.toLocaleString() }),
  },
  {
    id: "minutes",
    label: "Min",
    Icon: Clock,
    format: (v) => ({ value: v.toLocaleString() }),
  },
  {
    id: "reps",
    label: "Repetitions",
    Icon: Repeat,
    format: (v) => ({ value: v.toLocaleString() }),
  },
  {
    id: "volume",
    label: "Weight",
    Icon: Weight,
    format: (v) => ({ value: v.toLocaleString(), suffix: "lb" }),
  },
];

export function StatCards({ totals }: { totals: ProgressTotals }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {CARDS.map(({ id, label, Icon, format }) => {
        const { value, suffix } = format(totals[id]);
        return (
          <div
            key={id}
            className="rounded-2xl border border-border bg-surface p-4 flex flex-col gap-2"
          >
            <Icon
              className="w-4 h-4 text-foreground-muted"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <div className="flex items-baseline gap-1 tabular-nums">
              <span className="text-3xl font-semibold text-accent leading-none">
                {value}
              </span>
              {suffix ? (
                <span className="text-base text-foreground-muted">{suffix}</span>
              ) : null}
            </div>
            <span className="text-xs text-foreground-muted">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
