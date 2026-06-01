"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { reorderDay } from "@/app/actions/program";
import { toast } from "@/components/toast";

export function DayMoveButtons({
  dayId,
  canMoveEarlier,
  canMoveLater,
}: {
  dayId: string;
  canMoveEarlier: boolean;
  canMoveLater: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function move(direction: "up" | "down") {
    if (pending) return;
    startTransition(async () => {
      try {
        await reorderDay({ dayId, direction });
        router.refresh();
      } catch (err) {
        console.error("reorderDay failed", err);
        toast(err instanceof Error ? err.message : "Could not move day.");
      }
    });
  }

  const btn =
    "h-9 w-9 rounded-md inline-flex items-center justify-center text-foreground-muted hover:bg-surface-hover outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={() => move("up")}
        disabled={pending || !canMoveEarlier}
        aria-label="Move day earlier"
        className={btn}
      >
        <ArrowLeft className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => move("down")}
        disabled={pending || !canMoveLater}
        aria-label="Move day later"
        className={cn(btn, "-ml-1")}
      >
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
