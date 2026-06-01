"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

// Minimal hand-rolled toast (no library): a module-level store + a <Toaster/>
// mounted once in the (app) layout. Replaces window.alert() for transient
// action-failure notices so they don't pop the browser's native "<host> says"
// dialog. Call toast("…") from any client component.
type ToastVariant = "error" | "info";
type ToastItem = { id: number; message: string; variant: ToastVariant };

let items: ToastItem[] = [];
const listeners = new Set<() => void>();
let nextId = 1;

function emit() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

// `items` keeps a stable reference between mutations, so useSyncExternalStore's
// Object.is check won't loop.
const EMPTY: ToastItem[] = [];
const getSnapshot = () => items;
const getServerSnapshot = () => EMPTY;

export function toast(message: string, variant: ToastVariant = "error") {
  const id = nextId++;
  items = [...items, { id, message, variant }];
  emit();
  setTimeout(() => {
    items = items.filter((t) => t.id !== id);
    emit();
  }, 4000);
}

export function Toaster() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (current.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] flex flex-col items-center gap-2 px-4 pb-[calc(env(safe-area-inset-bottom)+6rem)] pointer-events-none">
      {current.map((t) => (
        <div
          key={t.id}
          role={t.variant === "error" ? "alert" : "status"}
          className={cn(
            "pointer-events-auto w-full max-w-md rounded-lg border px-4 py-3 text-sm shadow-lg",
            t.variant === "error"
              ? "border-red-500/40 bg-red-500/15 text-red-200"
              : "border-border bg-surface text-foreground",
          )}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
