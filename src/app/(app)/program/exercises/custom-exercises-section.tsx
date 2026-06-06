"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExerciseMedia } from "@/components/exercise-media";
import { VideoExercisePlayer } from "@/components/video-exercise-player";
import { MuscleBadge } from "@/components/muscle-badge";
import { useDialog } from "@/lib/use-dialog";
import { regionsFromCatalogMuscles } from "@/lib/muscle-regions";
import {
  deleteCustomExercise,
  signCustomVideoUrl,
} from "@/app/actions/custom-exercise";
import { toast } from "@/components/toast";
import type { ReframeRect, TrimBounds, VideoMedia } from "@/lib/video-upload";

const RING =
  "outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]";

export type CustomExerciseItem = {
  id: string;
  name: string;
  muscles: string[];
  video_path: string;
  video_signed_url: string;
  poster_signed_url: string;
  crop_rect: ReframeRect | null;
  trim: TrimBounds | null;
  aspect_ratio: number | null;
};

export function CustomExercisesSection({
  items,
}: {
  items: CustomExerciseItem[];
}) {
  const [list, setList] = useState(items);
  const [preview, setPreview] = useState<CustomExerciseItem | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [, startDelete] = useTransition();

  function remove(id: string) {
    setConfirmId(null);
    setList((prev) => prev.filter((x) => x.id !== id)); // optimistic
    startDelete(async () => {
      try {
        await deleteCustomExercise({ id });
      } catch {
        setList(items); // revert to server snapshot
        toast("Couldn't remove — try again.");
      }
    });
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Your custom exercises</h2>
        <Link
          href="/program/exercises/new"
          className={cn(
            "inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 h-8 text-xs text-foreground-muted hover:text-foreground",
            RING
          )}
        >
          <Plus className="w-3.5 h-3.5" /> New
        </Link>
      </div>

      {list.length === 0 ? (
        <Link
          href="/program/exercises/new"
          className={cn(
            "flex items-center gap-2 rounded-2xl border border-dashed border-border-strong bg-surface p-4 text-sm text-foreground-muted",
            RING
          )}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
            <Plus className="w-4 h-4" />
          </span>
          Upload a video clip to create your own exercise.
        </Link>
      ) : (
        <ul className="space-y-2">
          {list.map((item) => {
            const confirming = confirmId === item.id;
            return (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3"
              >
                <button
                  type="button"
                  onClick={() => setPreview(item)}
                  aria-label={`Preview ${item.name}`}
                  className={cn("shrink-0 rounded", RING)}
                >
                  <ExerciseMedia
                    imageUrl={null}
                    poster={item.poster_signed_url || null}
                    alt={item.name}
                    size={56}
                  />
                </button>
                <MuscleBadge
                  regions={regionsFromCatalogMuscles(item.muscles)}
                  size={28}
                  className="shrink-0"
                />
                <p className="flex-1 min-w-0 truncate text-sm font-medium">
                  {item.name}
                </p>
                {confirming ? (
                  <span className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      className={cn(
                        "h-8 px-3 rounded-full bg-red-500/15 text-red-400 text-xs",
                        RING
                      )}
                    >
                      Remove
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      aria-label="Cancel"
                      className={cn(
                        "h-8 w-8 flex items-center justify-center rounded-full border border-border text-foreground-muted",
                        RING
                      )}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmId(item.id)}
                    aria-label={`Remove ${item.name}`}
                    className={cn(
                      "h-9 w-9 shrink-0 flex items-center justify-center rounded-full text-foreground-muted hover:text-foreground",
                      RING
                    )}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {preview ? (
        <PreviewModal item={preview} onClose={() => setPreview(null)} />
      ) : null}
    </section>
  );
}

function PreviewModal({
  item,
  onClose,
}: {
  item: CustomExerciseItem;
  onClose: () => void;
}) {
  const ref = useDialog<HTMLDivElement>(true, onClose);
  const media: VideoMedia = {
    videoUrl: item.video_signed_url,
    posterUrl: item.poster_signed_url || null,
    rect: item.crop_rect,
    trim: item.trim,
    aspect: item.aspect_ratio,
  };
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={item.name}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-2xl border border-border bg-surface p-4 outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className={cn(
            "absolute top-2 right-2 z-10 h-9 w-9 rounded-full inline-flex items-center justify-center bg-black/50 text-white",
            RING
          )}
        >
          <X className="w-4 h-4" />
        </button>
        <VideoExercisePlayer
          media={media}
          alt={item.name}
          onNeedsRefresh={() => signCustomVideoUrl({ path: item.video_path })}
        />
        <p className="mt-3 text-center text-sm font-medium">{item.name}</p>
      </div>
    </div>
  );
}
