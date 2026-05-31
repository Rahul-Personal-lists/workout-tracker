"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Moon,
  Plus,
} from "lucide-react";
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
  const [menuOpen, setMenuOpen] = useState(false);
  // null = step 1 (pick type); "rest" | "training" = step 2 (pick position)
  const [pendingKind, setPendingKind] = useState<"rest" | "training" | null>(
    null,
  );

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

  function closeMenu() {
    setMenuOpen(false);
    setPendingKind(null);
  }

  function onInsertDay(title: string, position: number) {
    if (pending) return;
    closeMenu();
    startTransition(async () => {
      try {
        const { dayId } = await addDay({
          programId,
          label: `Day ${position}`,
          title,
          position,
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
      {/* Add-day control sits OUTSIDE the overflow-x-auto strip: that container
          forces overflow-y to compute to `auto`, which would clip this dropdown. */}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => {
            if (menuOpen) closeMenu();
            else setMenuOpen(true);
          }}
          disabled={pending}
          aria-label="Add day"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className={cn(
            "h-9 w-9 rounded-full inline-flex items-center justify-center border border-dashed border-border text-foreground-muted outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]",
            pending && "opacity-50",
          )}
        >
          <Plus className="w-4 h-4" />
        </button>
        {menuOpen ? (
          <>
            <button
              type="button"
              aria-hidden="true"
              tabIndex={-1}
              onClick={closeMenu}
              className="fixed inset-0 z-40 cursor-default"
            />
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-border bg-surface p-1 shadow-lg"
            >
              {pendingKind === null ? (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => setPendingKind("training")}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-surface-hover outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
                  >
                    <Dumbbell className="w-4 h-4 text-foreground-muted" />
                    Training day
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => setPendingKind("rest")}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-surface-hover outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
                  >
                    <Moon className="w-4 h-4 text-foreground-muted" />
                    Rest day
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1 px-1 pb-1">
                    <button
                      type="button"
                      onClick={() => setPendingKind(null)}
                      aria-label="Back"
                      className="h-7 w-7 flex items-center justify-center rounded-md text-foreground-muted hover:bg-surface-hover outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs uppercase tracking-wide text-foreground-muted">
                      {pendingKind === "rest"
                        ? "Insert rest day"
                        : "Insert training day"}
                    </span>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      onInsertDay(pendingKind === "rest" ? "Rest" : "New day", 1)
                    }
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-surface-hover outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
                  >
                    Before Day 1
                  </button>
                  {Array.from({ length: templateCount }, (_, i) => {
                    const after = i + 1;
                    const position = after + 1;
                    const isEnd = after === templateCount;
                    return (
                      <button
                        key={after}
                        type="button"
                        role="menuitem"
                        onClick={() =>
                          onInsertDay(
                            pendingKind === "rest" ? "Rest" : "New day",
                            position,
                          )
                        }
                        className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-surface-hover outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
                      >
                        <span>After Day {after}</span>
                        {isEnd ? (
                          <span className="text-[10px] uppercase tracking-wide text-foreground-muted">
                            End
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
