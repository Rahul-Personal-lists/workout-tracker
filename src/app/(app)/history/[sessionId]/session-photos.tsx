"use client";

import { useState, useTransition } from "react";
import { Trash2, X } from "lucide-react";
import { deleteSessionPhoto } from "@/app/actions/workout";
import type { SessionPhoto } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { useDialog } from "@/lib/use-dialog";
import { ConfirmSheet } from "@/components/confirm-sheet";
import { toast } from "@/components/toast";

export function SessionPhotos({ photos }: { photos: SessionPhoto[] }) {
  const [active, setActive] = useState<SessionPhoto | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SessionPhoto | null>(null);
  const [pending, startTransition] = useTransition();
  const dialogRef = useDialog<HTMLDivElement>(!!active, () => setActive(null));

  function doDelete() {
    const photo = confirmDelete;
    if (!photo) return;
    startTransition(async () => {
      try {
        await deleteSessionPhoto({ photoId: photo.id });
        setConfirmDelete(null);
        setActive(null);
      } catch (err) {
        setConfirmDelete(null);
        toast(err instanceof Error ? err.message : "Could not delete photo.");
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {photos.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActive(p)}
            className="relative aspect-square rounded-md overflow-hidden bg-neutral-900 border border-neutral-800 outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.signed_url}
              alt="Workout photo"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {active ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setActive(null)}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Workout photo"
            tabIndex={-1}
            className="relative max-w-md w-full p-4 outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={active.signed_url}
              alt="Workout photo"
              className="w-full max-h-[80vh] object-contain rounded-md"
            />
            <div className="flex items-center justify-between mt-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(active)}
                disabled={pending}
                className={cn(
                  "h-10 px-4 rounded-md text-sm flex items-center gap-1.5 bg-red-500/15 text-red-400 border border-red-500/40 outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]",
                  pending && "opacity-50"
                )}
              >
                <Trash2 className="w-4 h-4" /> {pending ? "Deleting…" : "Delete"}
              </button>
              <button
                type="button"
                onClick={() => setActive(null)}
                aria-label="Close"
                className="h-10 w-10 rounded-md flex items-center justify-center text-neutral-300 outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <ConfirmSheet
        open={confirmDelete !== null}
        title="Delete this photo?"
        description="This can’t be undone."
        pending={pending}
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
