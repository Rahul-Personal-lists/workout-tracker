import Link from "next/link";
import { Pencil } from "lucide-react";
import { DayMoveButtons } from "./day-move-buttons";
import type { SlotState } from "./types";

type DayControlsProps = {
  dayId: string;
  initialTitle: string;
  selectedWeek: number;
  totalWeeks: number;
  deloadWeeks: number[];
  slotState: SlotState;
  canMoveEarlier: boolean;
  canMoveLater: boolean;
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
  slotState,
  canMoveEarlier,
  canMoveLater,
}: DayControlsProps) {
  const isDeload = deloadWeeks.includes(selectedWeek);
  const weekLine = isDeload
    ? `Week ${selectedWeek}/${totalWeeks} · Deload`
    : `Week ${selectedWeek}/${totalWeeks}`;
  const stageLabel = STAGE_LABEL[slotState];

  return (
    <div className="flex items-start justify-between gap-2">
      <DayMoveButtons
        dayId={dayId}
        canMoveEarlier={canMoveEarlier}
        canMoveLater={canMoveLater}
      />
      <div className="min-w-0 flex-1 text-center space-y-0.5">
        <p className="text-xs font-medium text-accent tabular-nums">
          {weekLine}
        </p>
        <p className="text-lg font-bold italic uppercase tracking-wide">
          {stageLabel}
        </p>
        <h2 className="text-xs font-medium tracking-wide uppercase truncate text-foreground-muted">
          {initialTitle}
        </h2>
      </div>
      <Link
        href={`/program/edit?day=${dayId}&week=${selectedWeek}`}
        aria-label="Edit workout"
        className="h-9 w-9 rounded-md inline-flex items-center justify-center text-foreground-muted hover:bg-surface-hover outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] shrink-0"
      >
        <Pencil className="w-4 h-4" />
      </Link>
    </div>
  );
}
