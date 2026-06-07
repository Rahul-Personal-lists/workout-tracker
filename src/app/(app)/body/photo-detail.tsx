"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, X } from "lucide-react";
import { recordBodyPhotos } from "@/app/actions/body";
import { createClient } from "@/lib/supabase/client";
import type { BodyPhotoRow } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { PHOTO_BUCKET } from "@/lib/photo-upload";
import { uploadImageFiles } from "@/lib/upload-photos";
import { todayLocalISODate } from "@/lib/local-date";
import { PhotoCapture } from "./photo-capture";
import { BodyPhotos } from "./body-photos";

// Drilldown that mirrors MetricDetail: a date-first "Log photo" card on top, the
// photo history below. Photos FK to body_logs(user_id, log_date), so a photo can
// only attach to a date that already has a logged metric — the Save button gates
// on that and the hint explains it rather than letting the action throw after a
// wasted upload.
export function PhotoDetail({
  photos,
  loggedDates,
  onBack,
}: {
  photos: BodyPhotoRow[];
  loggedDates: Set<string>;
  onBack: () => void;
}) {
  const router = useRouter();
  const today = todayLocalISODate();
  const [logDate, setLogDate] = useState(today);
  const [pickedPhotos, setPickedPhotos] = useState<File[]>([]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const hasLog = loggedDates.has(logDate);
  const lastPhotoUrl = photos[0]?.signed_url ?? null;

  const previewUrls = useMemo(
    () => pickedPhotos.map((f) => URL.createObjectURL(f)),
    [pickedPhotos]
  );

  // Revoke the previous batch of object URLs when the picked set changes or the
  // component unmounts — otherwise each pick leaks blob URLs for the page's life.
  useEffect(() => {
    return () => previewUrls.forEach((u) => URL.revokeObjectURL(u));
  }, [previewUrls]);

  function addPickedPhoto(file: File) {
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

    const { uploadedPaths, firstError } = await uploadImageFiles(
      supabase,
      pickedPhotos,
      (ext) => `${user.id}/body/${forDate}/${crypto.randomUUID()}.${ext}`,
    );

    if (uploadedPaths.length > 0) {
      try {
        await recordBodyPhotos({ logDate: forDate, paths: uploadedPaths });
      } catch (err) {
        await supabase.storage.from(PHOTO_BUCKET).remove(uploadedPaths);
        return err instanceof Error ? err.message : "Couldn't save photos";
      }
    }
    return firstError;
  }

  function onSave() {
    if (pickedPhotos.length === 0 || !hasLog) return;
    setError(null);
    startTransition(async () => {
      const photoErr = await uploadPhotos(logDate);
      if (photoErr) {
        setError(photoErr);
        return;
      }
      setPickedPhotos([]);
      setLogDate(today);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to measures"
          className="h-9 w-9 -ml-1 flex items-center justify-center text-foreground-muted outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="h-8 w-8 shrink-0 flex items-center justify-center rounded-md bg-surface-subtle text-foreground-muted">
          <Camera className="w-4 h-4" />
        </span>
        <h1 className="text-xl font-semibold">Photos</h1>
      </header>

      <div className="rounded-lg border border-border bg-surface p-3 space-y-2">
        <span className="text-[11px] uppercase tracking-wide text-foreground-muted">
          Log photo
        </span>
        <label className="block">
          <span className="block text-[11px] uppercase tracking-wide text-foreground-muted mb-1">
            Date
          </span>
          <input
            type="date"
            value={logDate}
            max={today}
            onChange={(e) => setLogDate(e.target.value)}
            className="w-full h-11 rounded-md bg-surface-subtle border border-border px-3 text-base tabular-nums outline-none focus:border-border-strong focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
          />
        </label>

        {pickedPhotos.length < 3 ? (
          <PhotoCapture onCapture={addPickedPhoto} lastPhotoUrl={lastPhotoUrl} />
        ) : null}

        {pickedPhotos.length > 0 ? (
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
        ) : null}

        <button
          type="button"
          onClick={onSave}
          disabled={pending || pickedPhotos.length === 0 || !hasLog}
          className={cn(
            "w-full h-11 px-4 rounded-md font-medium text-sm bg-accent text-accent-foreground outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]",
            (pending || pickedPhotos.length === 0 || !hasLog) && "opacity-50"
          )}
        >
          {pending ? "Saving…" : "Save photos"}
        </button>

        {!hasLog ? (
          <p className="text-xs text-foreground-muted">
            Log a weight, body fat, or calories entry for this date first —
            photos attach to a logged day.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-xs text-red-400">
            {error}
          </p>
        ) : null}
      </div>

      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-wide text-foreground-muted">
          History
        </h2>
        {photos.length > 0 ? (
          <BodyPhotos photos={photos} />
        ) : (
          <p className="text-sm text-foreground-muted">No photos yet.</p>
        )}
      </section>
    </div>
  );
}
