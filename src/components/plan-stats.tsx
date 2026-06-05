// Compact "N exercises · ~M min · ~K cal" row for a plan/day. Pure presentational
// (no client directive). Numbers are estimates — hence the "~" prefix.
import { Clock, Dumbbell, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

export function PlanStats({
  exerciseCount,
  durationSec,
  calories,
  className,
}: {
  exerciseCount: number;
  durationSec: number;
  calories: number | null;
  className?: string;
}) {
  const minutes = Math.round(durationSec / 60);
  return (
    <div
      className={cn(
        "flex items-center gap-3 text-xs text-foreground-muted",
        className
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        <Dumbbell className="w-3.5 h-3.5" aria-hidden />
        <span className="tabular-nums text-foreground">{exerciseCount}</span>{" "}
        {exerciseCount === 1 ? "exercise" : "exercises"}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" aria-hidden />
        <span className="tabular-nums text-foreground">~{minutes}</span> min
      </span>
      {calories !== null ? (
        <span className="inline-flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5" aria-hidden />
          <span className="tabular-nums text-foreground">~{calories}</span> cal
        </span>
      ) : null}
    </div>
  );
}
