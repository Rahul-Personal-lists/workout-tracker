"use client";

import { useRef, useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { renameProgram } from "@/app/actions/program";

type Props = {
  programId: string;
  initialName: string;
};

export function EditableProgramName({ programId, initialName }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function open() {
    setEditing(true);
    requestAnimationFrame(() => inputRef.current?.select());
  }

  function save() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === initialName) {
      setName(initialName);
      setEditing(false);
      return;
    }
    startTransition(async () => {
      try {
        await renameProgram({ programId, name: trimmed });
      } catch {
        setName(initialName);
      }
      setEditing(false);
    });
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      save();
    }
    if (e.key === "Escape") {
      setName(initialName);
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={save}
        onKeyDown={onKeyDown}
        disabled={pending}
        maxLength={80}
        className={cn(
          "text-2xl font-semibold bg-transparent border-b border-accent outline-none w-full",
          pending && "opacity-50"
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={open}
      className="group flex items-center gap-2 text-left"
    >
      <h1 className="text-2xl font-semibold">{initialName}</h1>
      <Pencil className="w-3.5 h-3.5 text-neutral-500 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity" />
    </button>
  );
}
