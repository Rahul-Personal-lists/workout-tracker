"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { recordBodyPhotos } from "@/app/actions/body";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  MAX_PHOTO_BYTES,
  PHOTO_BUCKET,
  isLikelyImage,
  photoContentType,
  photoExt,
} from "@/lib/photo-upload";
import { todayLocalISODate } from "@/lib/local-date";
import { PhotoCapture } from "./photo-capture";

export function PhotoAdd({
  lastPhotoUrl,
  loggedDates,
}: {
  lastPhotoUrl: string | null;
  // Photos FK to body_logs(user_id, log_date), so a photo can only attach to a
  // date that already has a logged entry (weight, body fat, or calories). Gate
  // the UI on these dates rather than letting recordBodyPhotos throw after a
  // wasted upload.
  loggedDates: Set<string>;
}) {
  const router = useRouter();
  const today = todayLocalISODate();
  const [date, setDate] = useState(today);
  const [pickedPhotos, setPickedPhotos] = useState<File[]>([]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const hasLog = loggedDates.has(date);

  const previewUrls = useMemo(
    () => pickedPhotos.map((f) => URL.createObjectURL(f)),
    [pickedPhotos]
  );

  // Revoke the previous batch of object URLs when the picked set changes or the
  // component unmounts — otherwise each pick leaks blob URLs for the page's life.
  useEffect(() => {
    return () => previewUrls.forEach((u) => URL.revokeObjectURL(u));
  }, [previewUrls]);

  function addPickedPhotos(file: File) {
    setError(null);
    setPickedPhotos((prev) => [...prev, file].slice(0, 3));
  }

  function removePickedPhoto(idx: number) {
    setPickedPhotos((prev) => prev.filter((_, i) => i !== idx));
  }

  async function uploadPhotos(forDate: string): Promise<string | null> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return "Not signed in for photo upload.";

    const uploadedPaths: string[] = [];
    let firstUploadError: string | null = null;
    for (const file of pickedPhotos) {
      try {
        if (file.size > MAX_PHOTO_BYTES) {
          throw new Error(
            `Photo too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 25 MB.`
          );
        }
        if (!isLikelyImage(file)) {
          throw new Error(`Unsupported file: ${file.name || "(unnamed)"}`);
        }
        const ext = photoExt(file);
        const path = `${user.id}/body/${forDate}/${crypto.randomUUID()}.${ext}`;
        const contentType = photoContentType(file, ext);
        const { error: upErr } = await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(path, file, { contentType, upsert: false });
        if (upErr) throw upErr;
        uploadedPaths.push(path);
      } catch (err) {
        if (firstUploadError === null) {
          firstUploadError =
            err instanceof Error ? err.message : "Photo upload failed";
        }
      }
    }
    if (uploadedPaths.length > 0) {
      try {
        await recordBodyPhotos({ logDate: forDate, paths: uploadedPaths });
      } catch (err) {
        await supabase.storage.from(PHOTO_BUCKET).remove(uploadedPaths);
        return err instanceof Error ? err.message : "Couldn't save photos";
      }
    }
    return firstUploadError;
  }

  function onSave() {
    if (pickedPhotos.length === 0 || !hasLog) return;
    setError(null);
    startTransition(async () => {
      const photoErr = await uploadPhotos(date);
      if (photoErr) {
        setError(photoErr);
        return;
      }
      setPickedPhotos([]);
      setDate(today);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      {pickedPhotos.length < 3 ? (
        <PhotoCapture onCapture={addPickedPhotos} lastPhotoUrl={lastPhotoUrl} />
      ) : null}

      {pickedPhotos.length > 0 ? (
        <>
          <div className="grid grid-cols-3 gap-2">
            {pickedPhotos.map((file, i) => (
              <div
                key={`${file.name}-${i}`}
                className="relative aspect-square rounded-md overflow-hidden bg-surface-subtle border border-border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrls[i]}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePickedPhoto(i)}
                  aria-label="Remove photo"
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <label className="flex-1">
              <span className="block text-[11px] uppercase tracking-wide text-foreground-muted mb-1">
                Date
              </span>
              <input
                type="date"
                value={date}
                max={today}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-11 rounded-md bg-surface-subtle border border-border px-3 text-base tabular-nums outline-none focus:border-border-strong focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
              />
            </label>
            <button
              type="button"
              onClick={onSave}
              disabled={pending || !hasLog}
              className={cn(
                "h-11 px-4 rounded-md font-medium text-sm bg-accent text-accent-foreground outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]",
                (pending || !hasLog) && "opacity-50"
              )}
            >
              {pending ? "Saving…" : "Save photos"}
            </button>
          </div>
          {!hasLog ? (
            <p className="text-xs text-foreground-muted">
              Log an entry for this date first — photos attach to a logged day.
            </p>
          ) : null}
        </>
      ) : null}

      {error ? <p role="alert" className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
