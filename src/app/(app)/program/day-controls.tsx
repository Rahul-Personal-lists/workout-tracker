import Link from "next/link";
import { Pencil } from "lucide-react";
import type { SlotState } from "./types";

type DayControlsProps = {
  dayId: string;
  initialTitle: string;
  selectedWeek: number;
  totalWeeks: number;
  deloadWeeks: number[];
  programName: string;
  slotState: SlotState;
};

const STAGE_LABEL: Record<SlotState, string> = {
  completed: "COMPLETED",
  "in-progress": "IN PROGRESS",
  today: "TODAY'S WORKOUT",
  upcoming: "UPCOMING WORKOUT",
};

export function DayControls({
  dayId,
  initialTitle,
  selectedWeek,
  totalWeeks,
  deloadWeeks,
  programName,
  slotState,
}: DayControlsProps) {
  const isDeload = deloadWeeks.includes(selectedWeek);
  const weekLine = isDeload
    ? `Week ${selectedWeek}/${totalWeeks} · Deload`
    : `Week ${selectedWeek}/${totalWeeks} · ${programName}`;
  const stageLabel = STAGE_LABEL[slotState];

  return (
    <div className="text-center space-y-1">
      <p className="text-xs font-medium text-accent tabular-nums">
        {weekLine}
      </p>
      <p className="text-lg font-bold italic uppercase tracking-wide">
        {stageLabel}
      </p>
      <div className="flex items-center justify-center gap-1.5">
        <h2 className="text-xs font-medium tracking-wide uppercase truncate text-foreground-muted">
          {initialTitle}
        </h2>
        <Link
          href={`/program/edit?day=${dayId}&week=${selectedWeek}`}
          aria-label="Edit workout"
          className="h-9 w-9 rounded-md inline-flex items-center justify-center text-foreground-muted hover:bg-surface-hover outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
        >
          <Pencil className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
