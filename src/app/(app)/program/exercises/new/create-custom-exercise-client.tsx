"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Film, Pencil, Video } from "lucide-react";
import { cn, FOCUS_RING as RING } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { createCustomExercise } from "@/app/actions/custom-exercise";
import { VideoCropper, type CropperResult } from "@/components/video-cropper";
import { ImageReframer } from "@/components/image-reframer";
import { VideoRecorder } from "@/components/video-recorder";
import { MuscleBadge } from "@/components/muscle-badge";
import {
  MUSCLE_REGIONS,
  REGION_META,
  type MuscleRegion,
} from "@/lib/muscle-regions";
import { isLikelyImage, MAX_PHOTO_BYTES } from "@/lib/photo-upload";
import {
  MAX_VIDEO_BYTES,
  VIDEO_BUCKET,
  isLikelyVideo,
  videoContentType,
  videoExt,
} from "@/lib/video-upload";

type PhotoMedia = { kind: "photo"; poster: File };
type VideoMediaState = { kind: "video"; source: File; crop: CropperResult };
type Media = PhotoMedia | VideoMediaState;

export function CreateCustomExerciseClient({
  returnTo,
}: {
  returnTo: string | null;
}) {
  const router = useRouter();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [media, setMedia] = useState<Media | null>(null);
  const [muscles, setMuscles] = useState<Set<MuscleRegion>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();

  // Editor overlays + the file currently being edited.
  const [photoToReframe, setPhotoToReframe] = useState<File | null>(null);
  const [videoToCrop, setVideoToCrop] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);

  const posterFile = media?.kind === "photo" ? media.poster : media?.crop.poster ?? null;
  const posterUrl = useMemo(
    () => (posterFile ? URL.createObjectURL(posterFile) : null),
    [posterFile]
  );
  useEffect(() => {
    return () => {
      if (posterUrl) URL.revokeObjectURL(posterUrl);
    };
  }, [posterUrl]);

  function pickPhoto(file: File | null) {
    setError(null);
    if (!file) return;
    if (!isLikelyImage(file)) {
      setError("Pick an image file (jpg, png, webp, or heic).");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError(
        `Photo too large (${(file.size / 1024 / 1024).toFixed(0)} MB). Max ${
          MAX_PHOTO_BYTES / 1024 / 1024
        } MB.`
      );
      return;
    }
    setPhotoToReframe(file);
  }

  function pickVideo(file: File | null) {
    setError(null);
    if (!file) return;
    if (!isLikelyVideo(file)) {
      setError("Pick a video file (mp4, mov, or webm).");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setError(
        `Video too large (${(file.size / 1024 / 1024).toFixed(0)} MB). Max ${
          MAX_VIDEO_BYTES / 1024 / 1024
        } MB.`
      );
      return;
    }
    setVideoToCrop(file);
  }

  function toggleMuscle(r: MuscleRegion) {
    setMuscles((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });
  }

  const selectedRegions = [...muscles];
  const catalogMuscles = useMemo(() => {
    const s = new Set<string>();
    for (const r of muscles) for (const m of REGION_META[r].catalogMuscles) s.add(m);
    return [...s];
  }, [muscles]);

  function reEdit() {
    if (media?.kind === "photo") setPhotoToReframe(media.poster);
    else if (media?.kind === "video") setVideoToCrop(media.source);
  }

  function submit() {
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required.");
      return;
    }
    if (!media) {
      setError("Add a photo or video first.");
      return;
    }

    startSubmit(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Not signed in — try reloading.");
        return;
      }

      const id = crypto.randomUUID();
      const dir = `${user.id}/exercise-videos/${id}`;
      const posterPath = `${dir}/poster.jpg`;
      const uploaded: string[] = [];
      try {
        if (media.kind === "video") {
          const ext = videoExt(media.source);
          const videoPath = `${dir}/source.${ext}`;
          const up1 = await supabase.storage
            .from(VIDEO_BUCKET)
            .upload(videoPath, media.source, {
              contentType: videoContentType(media.source, ext),
              upsert: false,
            });
          if (up1.error) throw up1.error;
          uploaded.push(videoPath);

          const up2 = await supabase.storage
            .from(VIDEO_BUCKET)
            .upload(posterPath, media.crop.poster, {
              contentType: "image/jpeg",
              upsert: false,
            });
          if (up2.error) throw up2.error;
          uploaded.push(posterPath);

          await createCustomExercise({
            customExerciseId: id,
            name: trimmed,
            videoPath,
            posterPath,
            cropRect: media.crop.rect,
            trimStartSeconds: media.crop.trim.startSec,
            trimEndSeconds: media.crop.trim.endSec,
            aspectRatio: media.crop.aspect,
            muscles: catalogMuscles,
          });
        } else {
          const up = await supabase.storage
            .from(VIDEO_BUCKET)
            .upload(posterPath, media.poster, {
              contentType: "image/jpeg",
              upsert: false,
            });
          if (up.error) throw up.error;
          uploaded.push(posterPath);

          await createCustomExercise({
            customExerciseId: id,
            name: trimmed,
            videoPath: null,
            posterPath,
            cropRect: null,
            trimStartSeconds: null,
            trimEndSeconds: null,
            aspectRatio: 1,
            muscles: catalogMuscles,
          });
        }
      } catch (err) {
        if (uploaded.length) {
          await supabase.storage.from(VIDEO_BUCKET).remove(uploaded);
        }
        setError(err instanceof Error ? err.message : "Couldn't save the exercise.");
        return;
      }

      router.push(returnTo ?? "/program/exercises");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <label className="block space-y-1">
        <span className="block text-[11px] uppercase tracking-wide text-foreground-muted">
          Name
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          placeholder="e.g. Cable woodchop"
          className={cn(
            "w-full h-11 rounded-md bg-surface border border-border px-3 text-base",
            RING
          )}
        />
      </label>

      <div className="space-y-2">
        <span className="block text-[11px] uppercase tracking-wide text-foreground-muted">
          Media
        </span>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            pickPhoto(e.target.files?.[0] ?? null);
            if (photoInputRef.current) photoInputRef.current.value = "";
          }}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            pickVideo(e.target.files?.[0] ?? null);
            if (videoInputRef.current) videoInputRef.current.value = "";
          }}
        />
        {media && posterUrl ? (
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
            <span className="relative block h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={posterUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            </span>
            <div className="flex-1 min-w-0 text-xs text-foreground-muted">
              {media.kind === "video"
                ? `Clip ready · ${Math.round(media.crop.trim.endSec - media.crop.trim.startSec)}s`
                : "Photo ready"}
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <button
                type="button"
                onClick={reEdit}
                className={cn(
                  "inline-flex items-center gap-1 rounded text-xs text-foreground-muted hover:text-foreground",
                  RING
                )}
              >
                <Pencil className="w-3.5 h-3.5" /> Re-edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setMedia(null);
                  setError(null);
                }}
                className={cn(
                  "rounded text-xs text-foreground-muted hover:text-foreground",
                  RING
                )}
              >
                Replace
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className={cn(
                "w-full h-12 rounded-md border border-dashed border-border-strong text-sm text-foreground-muted flex items-center justify-center gap-1.5",
                RING
              )}
            >
              <Camera className="w-4 h-4" /> Add photo
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setRecording(true);
              }}
              className={cn(
                "w-full h-12 rounded-md border border-dashed border-border-strong text-sm text-foreground-muted flex items-center justify-center gap-1.5",
                RING
              )}
            >
              <Video className="w-4 h-4" /> Record with camera
              <span className="text-[11px] text-foreground-muted">· up to 80s</span>
            </button>
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              className={cn(
                "w-full h-12 rounded-md border border-dashed border-border-strong text-sm text-foreground-muted flex items-center justify-center gap-1.5",
                RING
              )}
            >
              <Film className="w-4 h-4" /> Upload / screen recording
            </button>
            <p className="text-xs text-foreground-muted leading-snug">
              Want a clip from another app? Record it with your phone&rsquo;s screen
              recorder, then upload it above.
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wide text-foreground-muted">
            Muscles worked
          </span>
          {selectedRegions.length > 0 ? (
            <MuscleBadge regions={selectedRegions} size={28} />
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {MUSCLE_REGIONS.map((r) => {
            const on = muscles.has(r.key);
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => toggleMuscle(r.key)}
                aria-pressed={on}
                className={cn(
                  "h-8 px-3 rounded-full text-xs border transition-colors",
                  RING,
                  on
                    ? "bg-accent text-accent-foreground border-accent"
                    : "border-border bg-surface text-foreground-muted"
                )}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className={cn(
          "h-12 w-full rounded-md bg-accent text-accent-foreground font-medium text-sm",
          RING,
          submitting && "opacity-50"
        )}
      >
        {submitting ? "Saving…" : "Save exercise"}
      </button>

      {photoToReframe ? (
        <ImageReframer
          file={photoToReframe}
          onConfirm={(poster) => {
            setMedia({ kind: "photo", poster });
            setPhotoToReframe(null);
          }}
          onCancel={() => setPhotoToReframe(null)}
        />
      ) : null}

      {videoToCrop ? (
        <VideoCropper
          file={videoToCrop}
          onConfirm={(crop) => {
            setMedia({ kind: "video", source: videoToCrop, crop });
            setVideoToCrop(null);
          }}
          onCancel={() => setVideoToCrop(null)}
        />
      ) : null}

      {recording ? (
        <VideoRecorder
          onConfirm={(file) => {
            setRecording(false);
            pickVideo(file);
          }}
          onCancel={() => setRecording(false)}
          onFallback={() => {
            setRecording(false);
            videoInputRef.current?.click();
          }}
        />
      ) : null}
    </div>
  );
}
