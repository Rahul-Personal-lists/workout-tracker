// Extract a still poster frame from a LOCAL video File, cropped to the chosen
// reframe rect. Drawn from the picked File's same-origin blob URL BEFORE upload,
// so the canvas is never tainted (we never draw the remote signed video).
// Mirrors the canvas pattern in body/photo-capture.tsx.
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

export async function extractPoster(
  video: HTMLVideoElement,
  rect: ReframeRect,
  atSec: number,
  maxSide = 640
): Promise<File> {
  // Seek slightly past the trim start to dodge a black first frame; MUST await
  // 'seeked' before drawImage or we capture the wrong/black frame.
  await seekTo(video, atSec);

  const sw = video.videoWidth;
  const sh = video.videoHeight;
  const cropW = rect.w * sw;
  const cropH = rect.h * sh;
  const scale = Math.min(1, maxSide / Math.max(cropW, cropH));
  const dw = Math.max(1, Math.round(cropW * scale));
  const dh = Math.max(1, Math.round(cropH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(video, rect.x * sw, rect.y * sh, cropW, cropH, 0, 0, dw, dh);

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Poster encode failed"))),
      "image/jpeg",
      0.85
    )
  );
  return new File([blob], "poster.jpg", { type: "image/jpeg" });
}
