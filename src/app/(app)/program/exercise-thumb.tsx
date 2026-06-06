"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { ExerciseAnimation } from "@/components/exercise-animation";
import { ExerciseMedia } from "@/components/exercise-media";
import { VideoExercisePlayer } from "@/components/video-exercise-player";
import { signCustomVideoUrl } from "@/app/actions/custom-exercise";
import type { VideoMedia } from "@/lib/video-upload";

export function ExerciseThumb({
  url,
  alt,
  video = null,
  videoPath = null,
}: {
  url: string | null;
  alt: string;
  video?: VideoMedia | null;
  videoPath?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState(288);

  useEffect(() => {
    if (!open) return;
    const update = () =>
      setSize(Math.min(360, window.innerWidth - 48, window.innerHeight - 200));
    update();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("resize", update);
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("resize", update);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!url && !video) {
    return <ExerciseAnimation url={url} alt={alt} size={40} shape="circle" />;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Enlarge ${alt} ${video ? "video" : "animation"}`}
        className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
      >
        <ExerciseMedia
          imageUrl={url}
          poster={video ? video.posterUrl : null}
          alt={alt}
          size={40}
          shape="circle"
        />
      </button>
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/80 p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-sm flex-col items-center gap-3"
          >
            {video ? (
              <VideoExercisePlayer
                media={video}
                alt={alt}
                onNeedsRefresh={
                  videoPath
                    ? () => signCustomVideoUrl({ path: videoPath })
                    : undefined
                }
              />
            ) : (
              <ExerciseAnimation url={url} alt={alt} size={size} shape="square" />
            )}
            <p className="text-sm font-medium text-center text-foreground">
              {alt}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="absolute top-4 right-4 h-10 w-10 rounded-full inline-flex items-center justify-center border border-border bg-surface text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ) : null}
    </>
  );
}
