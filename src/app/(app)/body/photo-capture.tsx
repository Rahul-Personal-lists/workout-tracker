"use client";

import { useEffect, useRef, useState, type Ref } from "react";
import { Camera, X } from "lucide-react";

// The native file picker can't ghost a previous photo for angle alignment, so
// we use an in-app getUserMedia camera that overlays the last photo at low
// opacity. Falls back to a plain file input when the camera is unavailable.
export function PhotoCapture({
  onCapture,
  lastPhotoUrl,
  disabled,
  triggerRef,
}: {
  onCapture: (file: File) => void;
  lastPhotoUrl?: string | null;
  disabled?: boolean;
  triggerRef?: Ref<HTMLButtonElement>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);

  const cameraSupported =
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function";

  useEffect(() => {
    if (!cameraOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        setCamError("Camera unavailable — choose a file instead.");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [cameraOpen]);

  function openCamera() {
    if (cameraSupported) {
      setCamError(null);
      setCameraOpen(true);
    } else {
      fileInputRef.current?.click();
    }
  }

  function closeCamera() {
    setCameraOpen(false);
  }

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCapture(
          new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" })
        );
        closeCamera();
      },
      "image/jpeg",
      0.9
    );
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          const files = e.target.files;
          if (files) Array.from(files).forEach(onCapture);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
        className="hidden"
      />
      <button
        ref={triggerRef}
        type="button"
        onClick={openCamera}
        disabled={disabled}
        className="w-full h-11 rounded-md text-sm border border-dashed border-border-strong text-foreground-muted flex items-center justify-center gap-1.5 disabled:opacity-50"
      >
        <Camera className="w-4 h-4" /> Add photo
      </button>

      {cameraOpen ? (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex items-center justify-between p-3 text-white">
            <span className="text-sm">
              {lastPhotoUrl ? "Line up with your last photo" : "Take a photo"}
            </span>
            <button
              type="button"
              onClick={closeCamera}
              aria-label="Close camera"
              className="h-9 w-9 flex items-center justify-center rounded-full bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="relative flex-1 overflow-hidden">
            <video
              ref={videoRef}
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />
            {lastPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lastPhotoUrl}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none"
              />
            ) : null}
            {camError ? (
              <p className="absolute inset-x-0 bottom-24 text-center text-sm text-white/80 px-6">
                {camError}
              </p>
            ) : null}
          </div>
          <div className="p-5 flex items-center justify-center gap-6 text-white">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-sm text-white/80"
            >
              Use file
            </button>
            <button
              type="button"
              onClick={capture}
              disabled={!!camError}
              aria-label="Capture photo"
              className="h-16 w-16 rounded-full border-4 border-white bg-white/20 disabled:opacity-40"
            />
            <span className="w-10" />
          </div>
        </div>
      ) : null}
    </>
  );
}
