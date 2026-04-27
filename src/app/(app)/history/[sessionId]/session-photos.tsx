"use client";

import { useState, useTransition } from "react";
import { Trash2, X } from "lucide-react";
import { deleteSessionPhoto } from "@/app/actions/workout";
import type { SessionPhoto } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function SessionPhotos({ photos }: { photos: SessionPhoto[] }) {
  const [active, setActive] = useState<SessionPhoto | null>(null);
  const [pending, startTransition] = useTransition();

  function onDelete(photo: SessionPhoto) {
    if (!confirm("Delete this photo?")) return;
    startTransition(async () => {
      await deleteSessionPhoto({ photoId: photo.id });
      setActive(null);
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
            className="relative aspect-square rounded-md overflow-hidden bg-neutral-900 border border-neutral-800"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.signed_url}
              alt=""
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
            className="relative max-w-md w-full p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={active.signed_url}
              alt=""
              className="w-full max-h-[80vh] object-contain rounded-md"
            />
            <div className="flex items-center justify-between mt-3">
              <button
                type="button"
                onClick={() => onDelete(active)}
                disabled={pending}
                className={cn(
                  "h-10 px-4 rounded-md text-sm flex items-center gap-1.5 bg-red-500/15 text-red-400 border border-red-500/40",
                  pending && "opacity-50"
                )}
              >
                <Trash2 className="w-4 h-4" /> {pending ? "Deleting…" : "Delete"}
              </button>
              <button
                type="button"
                onClick={() => setActive(null)}
                aria-label="Close"
                className="h-10 w-10 rounded-md flex items-center justify-center text-neutral-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
