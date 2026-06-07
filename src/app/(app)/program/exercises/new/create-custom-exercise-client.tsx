"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Film, Pencil } from "lucide-react";
import { cn, FOCUS_RING as RING } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { createCustomExercise } from "@/app/actions/custom-exercise";
import { VideoCropper, type CropperResult } from "@/components/video-cropper";
import { MuscleBadge } from "@/components/muscle-badge";
import {
  MUSCLE_REGIONS,
  REGION_META,
  type MuscleRegion,
} from "@/lib/muscle-regions";
import {
  MAX_VIDEO_BYTES,
  VIDEO_BUCKET,
  isLikelyVideo,
  videoContentType,
  videoExt,
} from "@/lib/video-upload";

export function CreateCustomExerciseClient({
  returnTo,
}: {
  returnTo: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [crop, setCrop] = useState<CropperResult | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [muscles, setMuscles] = useState<Set<MuscleRegion>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();

  const posterUrl = useMemo(
    () => (crop ? URL.createObjectURL(crop.poster) : null),
    [crop]
  );
  useEffect(() => {
    return () => {
      if (posterUrl) URL.revokeObjectURL(posterUrl);
    };
  }, [posterUrl]);

  function pickFile(file: File | null) {
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
    setSourceFile(file);
    setCrop(null);
    setCropOpen(true);
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

  function submit() {
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required.");
      return;
    }
    if (!sourceFile || !crop) {
      setError("Add a video clip first.");
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
      const ext = videoExt(sourceFile);
      const videoPath = `${user.id}/exercise-videos/${id}/source.${ext}`;
      const posterPath = `${user.id}/exercise-videos/${id}/poster.jpg`;
      const uploaded: string[] = [];
      try {
        const up1 = await supabase.storage
          .from(VIDEO_BUCKET)
          .upload(videoPath, sourceFile, {
            contentType: videoContentType(sourceFile, ext),
            upsert: false,
          });
        if (up1.error) throw up1.error;
        uploaded.push(videoPath);

        const up2 = await supabase.storage
          .from(VIDEO_BUCKET)
          .upload(posterPath, crop.poster, {
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
          cropRect: crop.rect,
          trimStartSeconds: crop.trim.startSec,
          trimEndSeconds: crop.trim.endSec,
          aspectRatio: crop.aspect,
          muscles: catalogMuscles,
        });
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
          Video
        </span>
        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            pickFile(e.target.files?.[0] ?? null);
            if (fileRef.current) fileRef.current.value = "";
          }}
        />
        {crop && posterUrl ? (
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
              Clip ready · {Math.round(crop.trim.endSec - crop.trim.startSec)}s
            </div>
            <button
              type="button"
              onClick={() => setCropOpen(true)}
              className={cn(
                "inline-flex items-center gap-1 rounded text-xs text-foreground-muted hover:text-foreground",
                RING
              )}
            >
              <Pencil className="w-3.5 h-3.5" /> Re-edit
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={cn(
              "w-full h-12 rounded-md border border-dashed border-border-strong text-sm text-foreground-muted flex items-center justify-center gap-1.5",
              RING
            )}
          >
            <Film className="w-4 h-4" /> Add a video clip
          </button>
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

      {cropOpen && sourceFile ? (
        <VideoCropper
          file={sourceFile}
          onConfirm={(r) => {
            setCrop(r);
            setCropOpen(false);
          }}
          onCancel={() => {
            setCropOpen(false);
            if (!crop) setSourceFile(null);
          }}
        />
      ) : null}
    </div>
  );
}
