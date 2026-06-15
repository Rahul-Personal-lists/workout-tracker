"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { extractImagePoster } from "@/lib/extract-video-poster";
import { MAX_ZOOM, baseDims, clampView, rectFor } from "@/lib/reframe";

// Square reframe over a LOCAL image File: pan/pinch/zoom into a 1:1 crop, then
// bake the visible square to a JPEG poster. Mirrors VideoCropper's stage gestures
// (shared reframe geometry) minus the video/trim machinery.
export function ImageReframer({
  file,
  onConfirm,
  onCancel,
}: {
  file: File;
  onConfirm: (poster: File) => void;
  onCancel: () => void;
}) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  const imgRef = useRef<HTMLImageElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState({ cx: 0.5, cy: 0.5 });
  const [busy, setBusy] = useState(false);

  const zoomRef = useRef(1);
  const centerRef = useRef({ cx: 0.5, cy: 0.5 });
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);

  const ready = natural.w > 0 && natural.h > 0;
  const sa = ready ? natural.w / natural.h : 1;
  const target = 1; // square
  const rect = ready ? rectFor(target, sa, zoom, center) : null;

  function applyView(nextZoom: number, nextCenter: { cx: number; cy: number }) {
    const { zoom: z, center: c } = clampView(target, sa, nextZoom, nextCenter);
    zoomRef.current = z;
    centerRef.current = c;
    setZoom(z);
    setCenter(c);
  }

  function onLoad() {
    const img = imgRef.current;
    if (!img) return;
    setNatural({ w: img.naturalWidth, h: img.naturalHeight });
  }

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: zoomRef.current };
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const stage = stageRef.current;
    if (!stage) return;
    const { width: sw, height: sh } = stage.getBoundingClientRect();

    if (pointers.current.size >= 2 && pinch.current) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const ratio = dist / (pinch.current.dist || 1);
      applyView(pinch.current.zoom * ratio, centerRef.current);
      return;
    }

    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const { baseW, baseH } = baseDims(target, sa);
    const cw = baseW / zoomRef.current;
    const ch = baseH / zoomRef.current;
    applyView(zoomRef.current, {
      cx: centerRef.current.cx - (dx / sw) * cw,
      cy: centerRef.current.cy - (dy / sh) * ch,
    });
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }

  async function confirm() {
    const img = imgRef.current;
    if (!img || !rect || busy) return;
    setBusy(true);
    try {
      const poster = await extractImagePoster(img, rect);
      onConfirm(poster);
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white">
      <div className="flex items-center justify-between p-3">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          className="h-9 w-9 flex items-center justify-center rounded-full bg-white/10 outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
        >
          <X className="w-5 h-5" />
        </button>
        <span className="text-sm">Reframe photo</span>
        <button
          type="button"
          onClick={confirm}
          disabled={busy || !ready}
          aria-label="Use photo"
          className={cn(
            "h-9 px-4 flex items-center gap-1.5 rounded-full bg-accent text-accent-foreground text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]",
            (busy || !ready) && "opacity-50"
          )}
        >
          <Check className="w-4 h-4" /> {busy ? "Saving…" : "Use"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col items-center gap-5">
        <div
          ref={stageRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="relative mx-auto w-full max-w-sm overflow-hidden rounded-xl bg-black touch-none select-none cursor-move"
          style={{ aspectRatio: 1 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={url}
            alt=""
            onLoad={onLoad}
            draggable={false}
            style={
              rect
                ? {
                    position: "absolute",
                    width: `${(1 / rect.w) * 100}%`,
                    height: `${(1 / rect.h) * 100}%`,
                    left: `${-(rect.x / rect.w) * 100}%`,
                    top: `${-(rect.y / rect.h) * 100}%`,
                    maxWidth: "none",
                    objectFit: "cover",
                  }
                : { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }
            }
          />
        </div>

        <label className="flex w-full max-w-sm items-center gap-3 text-xs text-white/70">
          <span className="w-10 shrink-0">Zoom</span>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => applyView(parseFloat(e.target.value), centerRef.current)}
            className="flex-1 accent-[var(--color-accent)]"
            aria-label="Zoom"
          />
        </label>
        <p className="max-w-sm text-[11px] text-white/50">
          Drag to reposition · pinch or the slider to zoom. The square is your thumbnail.
        </p>
      </div>
    </div>
  );
}
