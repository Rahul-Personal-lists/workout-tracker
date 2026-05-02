"use client";

import { useRef, useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { setDisplayName } from "@/app/actions/profile";

type Props = {
  initialName: string | null;
};

export function DisplayNameField({ initialName }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName ?? "");
  const [savedName, setSavedName] = useState(initialName);
  const [pending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function open() {
    setErrorMsg(null);
    setEditing(true);
    requestAnimationFrame(() => inputRef.current?.select());
  }

  function cancel() {
    setName(savedName ?? "");
    setEditing(false);
    setErrorMsg(null);
  }

  function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      cancel();
      return;
    }
    if (trimmed === savedName) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      try {
        await setDisplayName({ name: trimmed });
        setSavedName(trimmed);
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
      <p className="text-xs text-foreground-muted">Your name</p>
      {editing ? (
        <div className="space-y-2">
          <input
            ref={inputRef}
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={save}
            onKeyDown={onKeyDown}
            disabled={pending}
            maxLength={40}
            placeholder="Enter your name"
            className={cn(
              "w-full text-sm bg-transparent border-b border-accent outline-none",
              pending && "opacity-50"
            )}
          />
          {errorMsg ? (
            <p className="text-xs text-red-400">{errorMsg}</p>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          onClick={open}
          className="group flex items-center gap-2 text-left w-full"
        >
          <span
            className={cn(
              "text-sm",
              savedName ? "" : "text-foreground-muted italic"
            )}
          >
            {savedName ?? "Not set — tap to add"}
          </span>
          <Pencil className="w-3.5 h-3.5 text-foreground-muted opacity-60 group-hover:opacity-100 transition-opacity" />
        </button>
      )}
    </div>
  );
}
