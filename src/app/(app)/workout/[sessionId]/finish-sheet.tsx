"use client";

import { useRef, useState } from "react";
import { Camera, Image as ImageIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDialog } from "@/lib/use-dialog";
import { PhotoThumb } from "./photo-thumb";

export function FinishSheet({
  photos,
  notes,
  finishing,
  uploadError,
  finishedSuccessfully,
  onAddPhotos,
  onRemovePhoto,
  onChangeNotes,
  onClose,
  onConfirm,
  onSkip,
}: {
  photos: File[];
  notes: string;
  finishing: boolean;
  uploadError: string | null;
  finishedSuccessfully: boolean;
  onAddPhotos: (list: FileList | null) => void;
  onRemovePhoto: (idx: number) => void;
  onChangeNotes: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  onSkip: () => void;
}) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const sheetRef = useDialog<HTMLDivElement>(true, onClose);
  const pickerRef = useDialog<HTMLDivElement>(
    pickerOpen,
    () => setPickerOpen(false)
  );

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" onClick={onClose}>
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Finish workout"
        tabIndex={-1}
        className="w-full max-w-md bg-neutral-950 border-t border-neutral-800 rounded-t-xl px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] space-y-4 outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Finish workout</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-9 w-9 -mr-2 flex items-center justify-center text-neutral-400 outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wide text-neutral-500">
            Photos (optional)
          </label>
          {photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((file, i) => (
                <PhotoThumb key={i} file={file} onRemove={() => onRemovePhoto(i)} />
              ))}
            </div>
          ) : null}
          {photos.length < 6 ? (
            <>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="w-full flex items-center justify-center gap-2 h-12 rounded-md border border-dashed border-neutral-700 text-sm text-neutral-300 outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
              >
                <Camera className="w-4 h-4" />
                <span>{photos.length === 0 ? "Add photo" : "Add more"}</span>
              </button>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                aria-label="Take photo with camera"
                className="hidden"
                onChange={(e) => {
                  onAddPhotos(e.target.files);
                  e.currentTarget.value = "";
                }}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                aria-label="Choose photos from library"
                className="hidden"
                onChange={(e) => {
                  onAddPhotos(e.target.files);
                  e.currentTarget.value = "";
                }}
              />
            </>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wide text-neutral-500">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => onChangeNotes(e.target.value)}
            rows={2}
            aria-label="Notes"
            className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm outline-none focus:border-neutral-600 focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
            placeholder="Felt strong, bumped weight on…"
          />
        </div>

        {uploadError ? (
          <p role="alert" className="rounded-md border border-red-500/40 bg-red-500/10 text-red-300 text-xs px-3 py-2">
            {finishedSuccessfully ? (
              <>
                <span className="text-emerald-300">Your workout and notes are saved.</span>{" "}
              </>
            ) : null}
            {uploadError}
          </p>
        ) : null}

        {finishedSuccessfully && uploadError ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onSkip}
              disabled={finishing}
              className={cn(
                "h-12 rounded-md font-medium bg-neutral-800 text-neutral-100 outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]",
                finishing && "opacity-50"
              )}
            >
              Skip & continue
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={finishing}
              className={cn(
                "h-12 rounded-md font-medium bg-emerald-500 text-black outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]",
                finishing && "opacity-50"
              )}
            >
              {finishing ? "Retrying…" : "Retry"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onConfirm}
            disabled={finishing}
            className={cn(
              "w-full h-12 rounded-md font-medium bg-emerald-500 text-black outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]",
              finishing && "opacity-50"
            )}
          >
            {finishing ? "Finishing…" : "Finish workout"}
          </button>
        )}
      </div>
    </div>

    {pickerOpen ? (
      <div
        className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70"
        onClick={() => setPickerOpen(false)}
      >
        <div
          ref={pickerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Add photo"
          tabIndex={-1}
          className="w-full max-w-md bg-neutral-950 border-t border-neutral-800 rounded-t-xl px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] space-y-3 outline-none"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Add photo</h2>
            <button
              type="button"
              onClick={() => setPickerOpen(false)}
              aria-label="Close"
              className="h-9 w-9 -mr-2 flex items-center justify-center text-neutral-400 outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setPickerOpen(false);
              cameraInputRef.current?.click();
            }}
            className="w-full flex items-center gap-3 h-12 px-3 rounded-md bg-neutral-900 border border-neutral-800 text-sm text-neutral-100 outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
          >
            <Camera className="w-4 h-4" />
            <span>Take photo</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPickerOpen(false);
              galleryInputRef.current?.click();
            }}
            className="w-full flex items-center gap-3 h-12 px-3 rounded-md bg-neutral-900 border border-neutral-800 text-sm text-neutral-100 outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
          >
            <ImageIcon className="w-4 h-4" />
            <span>Choose from library</span>
          </button>
        </div>
      </div>
    ) : null}
    </>
  );
}
