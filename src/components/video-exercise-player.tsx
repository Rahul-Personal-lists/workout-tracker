"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { cropStyle, type VideoMedia } from "@/lib/video-upload";
import { SPEEDS, usePlaybackSpeed } from "@/lib/stores/playback-speed";

// Plays a custom-exercise clip with the reframe applied (cropStyle) and the trim
// looped (rAF reset). Speed comes from the persisted store. iOS Safari needs
// muted + playsInline for inline autoplay; if play() is blocked the poster stays
// and a tap starts it. On a signed-URL 403 mid-session, onNeedsRefresh re-signs.
export function VideoExercisePlayer({
  media,
  alt,
  showSpeed = false,
  autoPlay = true,
  className,
  onNeedsRefresh,
}: {
  media: VideoMedia;
  alt: string;
  showSpeed?: boolean;
  autoPlay?: boolean;
  className?: string;
  onNeedsRefresh?: () => Promise<string | null>;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | null>(null);
  const [src, setSrc] = useState(media.videoUrl);
  const [refreshed, setRefreshed] = useState(false);

  const speed = usePlaybackSpeed((s) => s.speed);
  const setSpeed = usePlaybackSpeed((s) => s.setSpeed);

  const trim = media.trim;
  const aspect = media.aspect ?? 1;
  const portrait = aspect < 1;

  // Reset the (re-signable) src when the media changes — React's documented
  // "adjust state during render" pattern, no effect needed.
  const [trackedUrl, setTrackedUrl] = useState(media.videoUrl);
  if (media.videoUrl !== trackedUrl) {
    setTrackedUrl(media.videoUrl);
    setSrc(media.videoUrl);
    setRefreshed(false);
  }

  // Loop the trimmed segment.
  useEffect(() => {
    function tick() {
      const v = videoRef.current;
      if (v && trim && !v.paused) {
        if (v.currentTime >= trim.endSec || v.currentTime < trim.startSec - 0.1) {
          v.currentTime = trim.startSec;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [trim]);

  // Keep playbackRate in sync (some browsers reset it on load/play).
  useEffect(() => {
    const v = videoRef.current;
    if (v) v.playbackRate = speed;
  }, [speed, src]);

  function onLoadedMetadata() {
    const v = videoRef.current;
    if (!v) return;
    if (trim) v.currentTime = trim.startSec;
    v.playbackRate = speed;
    if (autoPlay) v.play().catch(() => {});
  }

  async function onError() {
    if (refreshed || !onNeedsRefresh) return;
    setRefreshed(true);
    const fresh = await onNeedsRefresh();
    if (fresh) setSrc(fresh);
  }

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }

  return (
    <div className={cn("flex w-full flex-col items-center gap-3", className)}>
      <div
        className="relative mx-auto overflow-hidden rounded-xl bg-black"
        style={
          portrait
            ? { height: "min(60vh, 460px)", aspectRatio: aspect }
            : { width: "100%", aspectRatio: aspect }
        }
      >
        <video
          ref={videoRef}
          src={src}
          poster={media.posterUrl ?? undefined}
          muted
          playsInline
          loop
          preload="metadata"
          aria-label={alt}
          onLoadedMetadata={onLoadedMetadata}
          onError={onError}
          onClick={togglePlay}
          style={cropStyle(media.rect)}
        />
      </div>

      {showSpeed ? (
        <div className="flex items-center gap-1.5" role="group" aria-label="Playback speed">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
              aria-pressed={speed === s}
              className={cn(
                "h-8 rounded-full border px-2.5 text-xs tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]",
                speed === s
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border text-foreground-muted hover:text-foreground"
              )}
            >
              {s}×
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
