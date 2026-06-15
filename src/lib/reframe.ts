// Pure pan/zoom/square-crop geometry shared by VideoCropper and ImageReframer so
// the editor preview and the baked output frame are pixel-identical. All rects
// are normalized 0..1 in source coordinates (see cropStyle in video-upload.ts).
import type { ReframeRect } from "@/lib/video-upload";

export const MAX_ZOOM = 4;

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

// Largest centered box of display aspect `targetAspect` (W/H) that fits inside a
// source of aspect `sourceAspect`, as a fraction (0..1) of the source.
export function baseDims(
  targetAspect: number,
  sourceAspect: number
): { baseW: number; baseH: number } {
  const ratio = targetAspect / sourceAspect;
  return ratio >= 1 ? { baseW: 1, baseH: 1 / ratio } : { baseW: ratio, baseH: 1 };
}

// Crop rect for a zoom + center, clamped so it stays inside the source.
export function rectFor(
  targetAspect: number,
  sourceAspect: number,
  zoom: number,
  center: { cx: number; cy: number }
): ReframeRect {
  const { baseW, baseH } = baseDims(targetAspect, sourceAspect);
  const cw = baseW / zoom;
  const ch = baseH / zoom;
  const cx = clamp(center.cx, cw / 2, 1 - cw / 2);
  const cy = clamp(center.cy, ch / 2, 1 - ch / 2);
  return { x: cx - cw / 2, y: cy - ch / 2, w: cw, h: ch };
}

// Clamp a desired zoom+center to legal bounds (zoom in [1, MAX_ZOOM]; center
// keeps the crop inside the source). Returns the clamped values.
export function clampView(
  targetAspect: number,
  sourceAspect: number,
  nextZoom: number,
  nextCenter: { cx: number; cy: number }
): { zoom: number; center: { cx: number; cy: number } } {
  const zoom = clamp(nextZoom, 1, MAX_ZOOM);
  const { baseW, baseH } = baseDims(targetAspect, sourceAspect);
  const cw = baseW / zoom;
  const ch = baseH / zoom;
  const cx = clamp(nextCenter.cx, cw / 2, 1 - cw / 2);
  const cy = clamp(nextCenter.cy, ch / 2, 1 - ch / 2);
  return { zoom, center: { cx, cy } };
}
