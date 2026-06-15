// Mirror of photo-upload.ts for custom-exercise video clips. Validators are
// client-only (call sites in the create flow); the shared ReframeRect/TrimBounds
// types + cropStyle are imported by both the cropper and the playback player so
// the preview and the real playback frame are pixel-identical.
import type { CSSProperties } from "react";

export const VIDEO_BUCKET = "workout-photos"; // shared private bucket, exercise-videos/ prefix
// 150 MB covers an ~80s phone upload; in-app recordings are bitrate-capped to ~25 MB.
export const MAX_VIDEO_BYTES = 150 * 1024 * 1024;
// Trim cap AND the in-app recorder's hard auto-stop.
export const MAX_VIDEO_SECONDS = 80;

const ALLOWED_VIDEO_EXTS = ["mp4", "mov", "m4v", "webm"];

export type ReframeRect = { x: number; y: number; w: number; h: number };
export type TrimBounds = { startSec: number; endSec: number };

// Normalized playback descriptor handed to the player/thumbnail components.
// URLs are signed (short-lived); paths/crop/trim come from the snapshot.
export type VideoMedia = {
  videoUrl: string;
  posterUrl: string | null;
  rect: ReframeRect | null;
  trim: TrimBounds | null;
  aspect: number | null;
};

export const FULL_FRAME: ReframeRect = { x: 0, y: 0, w: 1, h: 1 };

export function isLikelyVideo(file: File): boolean {
  if (file.type && file.type.startsWith("video/")) return true;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return !!ext && ALLOWED_VIDEO_EXTS.includes(ext);
}

export function videoExt(file: File): string {
  const ext = (file.name.split(".").pop() || "mp4")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return ALLOWED_VIDEO_EXTS.includes(ext) ? ext : "mp4";
}

export function videoContentType(file: File, ext: string): string {
  if (file.type) return file.type;
  if (ext === "mov") return "video/quicktime";
  if (ext === "webm") return "video/webm";
  return "video/mp4"; // mp4 + m4v
}

// Display aspect (W/H) of a crop rect given the source's pixel dimensions.
export function cropAspect(rect: ReframeRect, sourceW: number, sourceH: number): number {
  return (rect.w * sourceW) / (rect.h * sourceH);
}

// Position a full-frame <video>/<img> so only `rect` (normalized 0..1 in source
// coords) shows, filling a wrapper whose aspect-ratio == the rect's display
// aspect. Pure positioning (no transform) so it's robust across browsers; the
// wrapper must be position:relative + overflow:hidden. A full-frame rect is
// equivalent to plain object-cover.
export function cropStyle(rect: ReframeRect | null): CSSProperties {
  const r = rect ?? FULL_FRAME;
  return {
    position: "absolute",
    width: `${(1 / r.w) * 100}%`,
    height: `${(1 / r.h) * 100}%`,
    left: `${-(r.x / r.w) * 100}%`,
    top: `${-(r.y / r.h) * 100}%`,
    maxWidth: "none",
    objectFit: "cover",
  };
}

// ── In-app recorder (MediaRecorder) ──
// ~2.5 Mbps keeps an 80s clip ≈ 25 MB, well under MAX_VIDEO_BYTES.
export const RECORD_BITS_PER_SECOND = 2_500_000;

// First container MediaRecorder supports here. iOS Safari → mp4; Chrome/Android
// → webm. undefined lets MediaRecorder pick its own default.
export function pickRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t));
}

// File extension matching the chosen recorder container.
export function recorderExt(mimeType: string | undefined): string {
  return mimeType && mimeType.startsWith("video/mp4") ? "mp4" : "webm";
}
