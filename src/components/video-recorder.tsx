"use client";

import { useEffect, useRef, useState } from "react";
import { SwitchCamera, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDialog } from "@/lib/use-dialog";
import {
  MAX_VIDEO_SECONDS,
  RECORD_BITS_PER_SECOND,
  pickRecorderMimeType,
  recorderExt,
} from "@/lib/video-upload";

function fmt(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// In-app camera recorder. Records video-only (player is muted; no mic prompt),
// hard auto-stops at MAX_VIDEO_SECONDS, and hands the recorded File to the
// parent (which opens VideoCropper). Falls back to file upload when the camera
// or MediaRecorder is unavailable.
export function VideoRecorder({
  onConfirm,
  onCancel,
  onFallback,
}: {
  onConfirm: (file: File) => void;
  onCancel: () => void;
  onFallback: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const dialogRef = useDialog<HTMLDivElement>(true, onCancel);

  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const supported =
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    typeof MediaRecorder !== "undefined";

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }
  function clearTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function stopRecording() {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    setRecording(false);
  }

  // Acquire (or re-acquire on flip) the camera stream.
  useEffect(() => {
    if (!supported) {
      /* eslint-disable react-hooks/set-state-in-effect --
         `supported` is a derived constant (never changes after mount); this branch
         runs exactly once as a mount-time initialization, not a cascade trigger. */
      setError("Recording isn't supported on this device — upload a clip instead.");
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
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
        setError("Camera unavailable — upload a clip instead.");
      }
    })();
    return () => {
      cancelled = true;
      stopStream();
    };
  }, [facing, supported]);

  // Unmount safety.
  useEffect(
    () => () => {
      clearTimer();
      stopStream();
    },
    []
  );

  // Hard cap: auto-stop at MAX_VIDEO_SECONDS.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect --
       Driving setRecording(false) from the elapsed counter is intentional:
       this is the only place the hard-cap fires; no cascade — elapsed only
       increments once per second and recording only flips to false once. */
    if (recording && elapsed >= MAX_VIDEO_SECONDS) stopRecording();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [elapsed, recording]);

  function startRecording() {
    const stream = streamRef.current;
    if (!stream) return;
    const mimeType = pickRecorderMimeType();
    chunksRef.current = [];
    const rec = new MediaRecorder(
      stream,
      mimeType
        ? { mimeType, videoBitsPerSecond: RECORD_BITS_PER_SECOND }
        : { videoBitsPerSecond: RECORD_BITS_PER_SECOND }
    );
    rec.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      clearTimer();
      const type = mimeType || "video/webm";
      const blob = new Blob(chunksRef.current, { type });
      const file = new File([blob], `recording.${recorderExt(mimeType)}`, { type });
      stopStream();
      onConfirm(file);
    };
    rec.start();
    recorderRef.current = rec;
    setRecording(true);
    setElapsed(0);
    timerRef.current = window.setInterval(() => setElapsed((e) => e + 1), 1000);
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Record video"
      tabIndex={-1}
      className="fixed inset-0 z-50 bg-black flex flex-col outline-none"
    >
      <div className="flex items-center justify-between p-3 text-white">
        <span className="text-sm tabular-nums">
          {recording ? `● ${fmt(elapsed)} / ${fmt(MAX_VIDEO_SECONDS)}` : "Record a clip"}
        </span>
        <div className="flex items-center gap-2">
          {!recording && !error ? (
            <button
              type="button"
              onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
              aria-label="Flip camera"
              className="h-9 w-9 flex items-center justify-center rounded-full bg-white/10"
            >
              <SwitchCamera className="w-5 h-5" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="h-9 w-9 flex items-center justify-center rounded-full bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
        {error ? (
          <p className="absolute inset-x-0 bottom-28 text-center text-sm text-white/80 px-6">
            {error}
          </p>
        ) : null}
      </div>

      <div className="p-5 flex items-center justify-center gap-6 text-white">
        {error ? (
          <button
            type="button"
            onClick={onFallback}
            className="h-12 px-5 rounded-full bg-accent text-accent-foreground text-sm font-medium"
          >
            Upload a clip instead
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onFallback}
              className="text-sm text-white/80"
            >
              Upload
            </button>
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              aria-label={recording ? "Stop recording" : "Start recording"}
              className={cn(
                "h-16 w-16 rounded-full border-4 border-white flex items-center justify-center",
                recording ? "bg-red-500/30" : "bg-white/20"
              )}
            >
              <span
                className={cn(
                  "bg-red-500 transition-all",
                  recording ? "h-6 w-6 rounded" : "h-10 w-10 rounded-full"
                )}
              />
            </button>
            <span className="w-10" />
          </>
        )}
      </div>
    </div>
  );
}
