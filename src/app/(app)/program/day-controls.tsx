"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { MoreVertical, Pencil, Plus, Trash2, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { archiveDay, renameDay } from "@/app/actions/program";

type DayControlsProps = {
  dayId: string;
  initialLabel: string;
  initialTitle: string;
  selectedWeek: number;
};

export function DayControls({
  dayId,
  initialLabel,
  initialTitle,
  selectedWeek,
}: DayControlsProps) {
  const [confirming, setConfirming] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(initialLabel);
  const [title, setTitle] = useState(initialTitle);
  const [pending, startTransition] = useTransition();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  function commitArchive() {
    startTransition(async () => {
      try {
        await archiveDay({ dayId });
      } catch (err) {
        console.error("archive day failed", err);
        setConfirming(false);
      }
    });
  }

  function openRename() {
    setMenuOpen(false);
    setEditing(true);
    requestAnimationFrame(() => labelRef.current?.select());
  }

  function cancelRename() {
    setLabel(initialLabel);
    setTitle(initialTitle);
    setEditing(false);
  }

  function saveRename() {
    const trimmedLabel = label.trim();
    const trimmedTitle = title.trim();
    if (
      !trimmedLabel ||
      !trimmedTitle ||
      (trimmedLabel === initialLabel && trimmedTitle === initialTitle)
    ) {
      cancelRename();
      return;
    }
    startTransition(async () => {
      try {
        await renameDay({
          dayId,
          label: trimmedLabel,
          title: trimmedTitle,
        });
      } catch {
        setLabel(initialLabel);
        setTitle(initialTitle);
      }
      setEditing(false);
    });
  }

  function onRenameKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      saveRename();
    }
    if (e.key === "Escape") {
      cancelRename();
    }
  }

  function onTriggerClick() {
    if (confirming) {
      commitArchive();
      return;
    }
    setMenuOpen((o) => !o);
  }

  if (editing) {
    return (
      <>
        <div className="flex-1 min-w-0 space-y-1.5">
          <input
            ref={labelRef}
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={onRenameKeyDown}
            disabled={pending}
            maxLength={40}
            placeholder="Label (e.g. Day 1)"
            className={cn(
              "text-[11px] uppercase tracking-wide bg-transparent border-b border-accent outline-none w-full text-neutral-200 placeholder:text-neutral-600",
              pending && "opacity-50"
            )}
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={onRenameKeyDown}
            disabled={pending}
            maxLength={80}
            placeholder="Title (e.g. Upper — Strength)"
            className={cn(
              "text-sm font-medium bg-transparent border-b border-accent outline-none w-full text-neutral-200 placeholder:text-neutral-600",
              pending && "opacity-50"
            )}
          />
        </div>
        <button
          type="button"
          onClick={saveRename}
          disabled={pending}
          aria-label="Save day name"
          className="h-11 w-11 rounded flex items-center justify-center text-accent hover:text-accent/80 transition-colors"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={cancelRename}
          disabled={pending}
          aria-label="Cancel rename"
          className="h-11 w-11 rounded flex items-center justify-center text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </>
    );
  }

  const titleWords = initialTitle.split(/\s+/);
  const titleLast = titleWords.pop() ?? "";
  const titleRest = titleWords.join(" ");

  return (
    <>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-neutral-500">
          {initialLabel}
        </p>
        <h2 className="text-sm font-medium truncate">
          {titleRest ? `${titleRest} ` : ""}
          <em className="font-display italic font-medium">{titleLast}</em>
        </h2>
      </div>
      <div ref={wrapperRef} className="relative">
        <button
          type="button"
          onClick={onTriggerClick}
          disabled={pending}
          aria-label={confirming ? "Confirm archive day" : "Day actions"}
          aria-expanded={menuOpen && !confirming}
          className={cn(
            "h-11 w-11 rounded flex items-center justify-center transition-colors",
            confirming
              ? "bg-red-500/15 text-red-400 border border-red-500/40"
              : "text-neutral-500 hover:text-neutral-300",
            pending && "opacity-50"
          )}
        >
          {confirming ? (
            <X className="w-4 h-4" />
          ) : (
            <MoreVertical className="w-4 h-4" />
          )}
        </button>
        {menuOpen && !confirming ? (
          <div
            role="menu"
            className="absolute right-0 top-12 z-20 min-w-44 rounded-md border border-neutral-700 bg-neutral-900 shadow-lg py-1"
          >
            <Link
              href={`/program/add?day=${dayId}&week=${selectedWeek}`}
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="w-full text-left px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800 inline-flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5 text-neutral-500" /> Add exercise
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={openRename}
              className="w-full text-left px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800 inline-flex items-center gap-2"
            >
              <Pencil className="w-3.5 h-3.5 text-neutral-500" /> Rename day
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                setConfirming(true);
                setTimeout(() => setConfirming(false), 2500);
              }}
              className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-neutral-800 inline-flex items-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" /> Archive day
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}
