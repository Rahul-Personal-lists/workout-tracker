// Extract a still poster JPEG cropped to a reframe rect, drawn from a LOCAL blob
// URL BEFORE upload so the canvas is never tainted. Mirrors body/photo-capture.
import type { ReframeRect } from "./video-upload";

export function seekTo(video: HTMLVideoElement, sec: number): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      video.removeEventListener("seeked", done);
      resolve();
    };
    video.addEventListener("seeked", done);
    try {
      video.currentTime = sec;
    } catch {
      video.removeEventListener("seeked", done);
      resolve();
    }
  });
}

// Draw `rect` (normalized 0..1 in source coords) of a video/image into a JPEG
// File, scaled so its longest side is <= maxSide.
async function drawCropToJpeg(
  source: CanvasImageSource,
  sourceW: number,
  sourceH: number,
  rect: ReframeRect,
  maxSide: number
): Promise<File> {
  const cropW = rect.w * sourceW;
  const cropH = rect.h * sourceH;
  const scale = Math.min(1, maxSide / Math.max(cropW, cropH));
  const dw = Math.max(1, Math.round(cropW * scale));
  const dh = Math.max(1, Math.round(cropH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(source, rect.x * sourceW, rect.y * sourceH, cropW, cropH, 0, 0, dw, dh);

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Poster encode failed"))),
      "image/jpeg",
      0.85
    )
  );
  return new File([blob], "poster.jpg", { type: "image/jpeg" });
}

export async function extractPoster(
  video: HTMLVideoElement,
  rect: ReframeRect,
  atSec: number,
  maxSide = 640
): Promise<File> {
  // Seek slightly past the trim start to dodge a black first frame; MUST await
  // 'seeked' before drawImage or we capture the wrong/black frame.
  await seekTo(video, atSec);
  return drawCropToJpeg(video, video.videoWidth, video.videoHeight, rect, maxSide);
}

// Bake the cropped square thumbnail from a loaded <img> (no seek needed).
export async function extractImagePoster(
  img: HTMLImageElement,
  rect: ReframeRect,
  maxSide = 640
): Promise<File> {
  return drawCropToJpeg(img, img.naturalWidth, img.naturalHeight, rect, maxSide);
}
