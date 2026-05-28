"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useTransition } from "react";
import { Check, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { addDay } from "@/app/actions/program";

type Template = { id: string };

export function DayTabs({
  templates,
  totalWeeks,
  selectedDayId,
  selectedWeek,
  programId,
  completedSlots,
  nextKey,
  inProgress,
}: {
  templates: Template[];
  totalWeeks: number;
  selectedDayId: string;
  selectedWeek: number;
  programId: string;
  // Array (not Set) because page.tsx passes it across the server/client
  // boundary, where Sets can't be serialized. We rebuild the Set client-side.
  completedSlots: string[];
  nextKey: string | null;
  inProgress: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const completedSet = useMemo(
    () => new Set(completedSlots),
    [completedSlots],
  );

  const templateCount = templates.length;
  const totalDays = totalWeeks * templateCount;

  // Each global slot (Day 1..N) maps to a (weekNumber, templateId).
  const slots = Array.from({ length: totalDays }, (_, i) => {
    const globalNumber = i + 1;
    const weekNumber = Math.floor(i / templateCount) + 1;
    const templateIndex = i % templateCount;
    const templateId = templates[templateIndex].id;
    return {
      globalNumber,
      weekNumber,
      templateId,
      key: `${templateId}:${weekNumber}`,
    };
  });

  const selectedTemplateIndex = templates.findIndex(
    (t) => t.id === selectedDayId,
  );
  const selectedGlobalNumber =
    selectedTemplateIndex >= 0
      ? (selectedWeek - 1) * templateCount + selectedTemplateIndex + 1
      : 1;

  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>(
      '[data-selected="true"]',
    );
    el?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [selectedGlobalNumber]);

  const prevSlot = slots[selectedGlobalNumber - 2] ?? null;
  const nextSlot = slots[selectedGlobalNumber] ?? null;

  function onAddDay() {
    if (pending) return;
    startTransition(async () => {
      try {
        const { dayId } = await addDay({
          programId,
          label: `Day ${templateCount + 1}`,
          title: "New day",
        });
        router.push(`/program?week=${selectedWeek}&day=${dayId}`);
        router.refresh();
      } catch (err) {
        console.error("addDay failed", err);
        alert(err instanceof Error ? err.message : "Could not add day.");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href={
          prevSlot
            ? `/program?week=${prevSlot.weekNumber}&day=${prevSlot.templateId}`
            : "#"
        }
        scroll={false}
        aria-label="Previous workout"
        aria-disabled={!prevSlot}
        tabIndex={prevSlot ? 0 : -1}
        className={cn(
          "h-9 w-9 inline-flex items-center justify-center rounded-full border border-border text-foreground-muted shrink-0",
          !prevSlot && "opacity-40 pointer-events-none",
        )}
      >
        <ChevronLeft className="w-4 h-4" />
      </Link>
      <div ref={ref} className="flex-1 overflow-x-auto -my-1 py-1">
        <div className="flex items-center gap-2 min-w-max justify-center">
          {slots.map((slot) => {
            const isSelected = slot.globalNumber === selectedGlobalNumber;
            const isNext = nextKey === slot.key;
            const isInProgress = isNext && inProgress;
            const isCompleted = !isInProgress && completedSet.has(slot.key);
            // Style precedence: selected > in-progress > today > completed > upcoming.
            const styleClass = isSelected
              ? "bg-accent text-accent-foreground border-accent"
              : isInProgress
                ? "border-accent text-accent bg-accent/10"
                : isNext
                  ? "border-accent text-foreground ring-2 ring-accent/40"
                  : isCompleted
                    ? "border-border bg-surface-subtle text-foreground-muted"
                    : "border-border text-foreground-muted";
            return (
              <Link
                key={slot.globalNumber}
                href={`/program?week=${slot.weekNumber}&day=${slot.templateId}`}
                scroll={false}
                data-selected={isSelected ? "true" : undefined}
                aria-label={
                  isCompleted
                    ? `Day ${slot.globalNumber}, completed`
                    : isNext
                      ? `Day ${slot.globalNumber}, today's workout`
                      : `Day ${slot.globalNumber}`
                }
                className={cn(
                  "h-9 px-3.5 rounded-full inline-flex items-center justify-center gap-1 text-sm font-medium border shrink-0 whitespace-nowrap",
                  styleClass,
                )}
              >
                {isCompleted ? (
                  <Check className="w-3 h-3" aria-hidden="true" />
                ) : null}
                Day {slot.globalNumber}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={onAddDay}
            disabled={pending}
            aria-label="Add day"
            className={cn(
              "h-9 w-9 rounded-full inline-flex items-center justify-center border border-dashed border-border text-foreground-muted shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]",
              pending && "opacity-50",
            )}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
      <Link
        href={
          nextSlot
            ? `/program?week=${nextSlot.weekNumber}&day=${nextSlot.templateId}`
            : "#"
        }
        scroll={false}
        aria-label="Next workout"
        aria-disabled={!nextSlot}
        tabIndex={nextSlot ? 0 : -1}
        className={cn(
          "h-9 w-9 inline-flex items-center justify-center rounded-full border border-border text-foreground-muted shrink-0",
          !nextSlot && "opacity-40 pointer-events-none",
        )}
      >
        <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
