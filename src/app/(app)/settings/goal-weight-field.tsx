"use client";

import { useRef, useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { setGoalWeight } from "@/app/actions/body";
import {
  formatWeight,
  formatWeightShort,
  parseWeightInput,
  unitLabel,
} from "@/lib/format";
import type { Units } from "@/lib/units";

type Props = {
  initialGoalLb: number | null;
  units: Units;
};

export function GoalWeightField({ initialGoalLb, units }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(
    initialGoalLb !== null ? formatWeightShort(initialGoalLb, units) : ""
  );
  const [savedGoal, setSavedGoal] = useState<number | null>(initialGoalLb);
  const [pending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function open() {
    setErrorMsg(null);
    setEditing(true);
    requestAnimationFrame(() => inputRef.current?.select());
  }

  function cancel() {
    setValue(savedGoal !== null ? formatWeightShort(savedGoal, units) : "");
    setEditing(false);
    setErrorMsg(null);
  }

  function save() {
    setErrorMsg(null);
    const trimmed = value.trim();
    if (trimmed === "") {
      startTransition(async () => {
        try {
          await setGoalWeight({ goalWeightLb: null });
          setSavedGoal(null);
          setEditing(false);
        } catch (err) {
          setErrorMsg(err instanceof Error ? err.message : "Failed to save.");
        }
      });
      return;
    }
    const lb = parseWeightInput(trimmed, units);
    if (lb === null || lb >= 2000) {
      setErrorMsg("Enter a positive number.");
      return;
    }
    if (lb === savedGoal) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      try {
        await setGoalWeight({ goalWeightLb: lb });
        setSavedGoal(lb);
        setEditing(false);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Failed to save.");
      }
    });
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      save();
    }
    if (e.key === "Escape") cancel();
  }

  return (
    <div className="rounded-md border border-border bg-surface p-4 space-y-1">
      <p className="text-xs text-foreground-muted">
        Goal weight ({unitLabel(units)})
      </p>
      {editing ? (
        <div className="space-y-2">
          <input
            ref={inputRef}
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={save}
            onKeyDown={onKeyDown}
            disabled={pending}
            inputMode="decimal"
            placeholder={units === "metric" ? "e.g. 79" : "e.g. 175"}
            className={cn(
              "w-full text-sm bg-transparent border-b border-accent outline-none tabular-nums",
              pending && "opacity-50"
            )}
          />
          {errorMsg ? <p className="text-xs text-red-400">{errorMsg}</p> : null}
          <p className="text-[11px] text-foreground-muted">
            Leave blank to clear.
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={open}
          className="group flex items-center gap-2 text-left w-full"
        >
          <span
            className={cn(
              "text-sm tabular-nums",
              savedGoal !== null ? "" : "text-foreground-muted italic"
            )}
          >
            {savedGoal !== null
              ? formatWeight(savedGoal, units)
              : "Not set — tap to add"}
          </span>
          <Pencil className="w-3.5 h-3.5 text-foreground-muted opacity-60 group-hover:opacity-100 transition-opacity" />
        </button>
      )}
    </div>
  );
}
