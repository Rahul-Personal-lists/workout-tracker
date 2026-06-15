"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { extractPoster } from "@/lib/extract-video-poster";
import {
  cropAspect,
  cropStyle,
  MAX_VIDEO_SECONDS,
  type ReframeRect,
  type TrimBounds,
} from "@/lib/video-upload";
import { MAX_ZOOM, baseDims, clamp, clampView, rectFor } from "@/lib/reframe";

const MIN_TRIM = 1; // seconds

function fmt(sec: number) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

type AspectMode = "original" | "square";

export type CropperResult = {
  rect: ReframeRect;
  trim: TrimBounds;
  aspect: number;
  poster: File;
  durationSec: number;
};

// Non-destructive reframe + trim editor. The "stage" IS the crop frame: whatever
// shows in it (after pan/zoom of the underlying full-frame video) is kept. The
// rect + trim are returned as metadata applied at playback — nothing re-encodes.
export function VideoCropper({
  file,
  onConfirm,
  onCancel,
}: {
  file: File;
  onConfirm: (r: CropperResult) => void;
  onCancel: () => void;
}) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [duration, setDuration] = useState(0);
  const [mode, setMode] = useState<AspectMode>("original");
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState({ cx: 0.5, cy: 0.5 });
  const [trim, setTrim] = useState<TrimBounds>({ startSec: 0, endSec: 0 });
  const [scrubbing, setScrubbing] = useState<null | "start" | "end">(null);
  const [busy, setBusy] = useState(false);

  // Refs mirror state for the event-driven loops/handlers (no stale closures).
  const zoomRef = useRef(1);
  const centerRef = useRef({ cx: 0.5, cy: 0.5 });
  const trimRef = useRef(trim);
  const scrubbingRef = useRef<null | "start" | "end">(null);
  const confirmingRef = useRef(false);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);

  useEffect(() => {
    trimRef.current = trim;
  }, [trim]);
  useEffect(() => {
    scrubbingRef.current = scrubbing;
  }, [scrubbing]);

  const ready = natural.w > 0 && natural.h > 0;
  const sa = ready ? natural.w / natural.h : 1;
  const target = mode === "square" ? 1 : sa; // display aspect W/H of the crop

  function rectForView(z: number, c: { cx: number; cy: number }): ReframeRect {
    return rectFor(target, sa, z, c);
  }

  const rect = ready ? rectForView(zoom, center) : null;

  function applyView(nextZoom: number, nextCenter: { cx: number; cy: number }) {
    const { zoom: z, center: c } = clampView(target, sa, nextZoom, nextCenter);
    zoomRef.current = z;
    centerRef.current = c;
    setZoom(z);
    setCenter(c);
  }

  function applyDuration(dur: number) {
    setDuration(dur);
    const end = Math.min(dur, MAX_VIDEO_SECONDS);
    setTrim({ startSec: 0, endSec: end });
    trimRef.current = { startSec: 0, endSec: end };
  }

  function onLoadedMetadata() {
    const v = videoRef.current;
    if (!v) return;
    setNatural({ w: v.videoWidth, h: v.videoHeight });
    if (Number.isFinite(v.duration) && v.duration > 0) {
      applyDuration(v.duration);
      v.muted = true;
      v.play().catch(() => {});
      return;
    }
    // MediaRecorder clips can report Infinity/NaN until seeked to the end.
    // Force the browser to resolve the real duration, then reset to the start.
    const onDurationChange = () => {
      if (Number.isFinite(v.duration) && v.duration > 0) {
        v.removeEventListener("durationchange", onDurationChange);
        applyDuration(v.duration);
        v.currentTime = 0;
        v.muted = true;
        v.play().catch(() => {});
      }
    };
    v.addEventListener("durationchange", onDurationChange);
    try {
      v.currentTime = 1e7; // jump past the end to trigger durationchange
    } catch {
      /* ignore */
    }
  }

  function onTimeUpdate() {
    const v = videoRef.current;
    if (!v || scrubbingRef.current || confirmingRef.current) return;
    const t = trimRef.current;
    if (v.currentTime >= t.endSec || v.currentTime < t.startSec - 0.1) {
      v.currentTime = t.startSec;
    }
  }

  // ── Reframe gestures (pan / pinch) on the stage ──
  function onStagePointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: zoomRef.current };
    }
  }

  function onStagePointerMove(e: React.PointerEvent) {
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

  function onStagePointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }

  function switchMode(next: AspectMode) {
    setMode(next);
    zoomRef.current = 1;
    centerRef.current = { cx: 0.5, cy: 0.5 };
    setZoom(1);
    setCenter({ cx: 0.5, cy: 0.5 });
  }

  // ── Trim handle scrubbing ──
  function seekPreview(sec: number) {
    const v = videoRef.current;
    if (v) v.currentTime = sec;
  }

  useEffect(() => {
    if (!scrubbing) return;
    function move(e: PointerEvent) {
      const track = trackRef.current;
      if (!track || duration <= 0) return;
      const r = track.getBoundingClientRect();
      const pct = clamp((e.clientX - r.left) / r.width, 0, 1);
      const sec = pct * duration;
      setTrim((t) => {
        if (scrubbingRef.current === "start") {
          const start = clamp(sec, 0, t.endSec - MIN_TRIM);
          seekPreview(start);
          return { ...t, startSec: start };
        }
        const end = clamp(sec, t.startSec + MIN_TRIM, duration);
        seekPreview(end);
        return { ...t, endSec: end };
      });
    }
    function up() {
      setScrubbing(null);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [scrubbing, duration]);

  async function confirm() {
    const v = videoRef.current;
    if (!v || !rect || busy) return;
    setBusy(true);
    confirmingRef.current = true;
    v.pause();
    try {
      const poster = await extractPoster(v, rect, Math.min(trim.startSec + 0.05, trim.endSec));
      onConfirm({
        rect,
        trim,
        aspect: cropAspect(rect, natural.w, natural.h),
        poster,
        durationSec: duration,
      });
    } catch {
      confirmingRef.current = false;
      setBusy(false);
      v.play().catch(() => {});
    }
  }

  const startPct = duration > 0 ? (trim.startSec / duration) * 100 : 0;
  const endPct = duration > 0 ? (trim.endSec / duration) * 100 : 100;
  const portrait = target < 1;

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
        <span className="text-sm">Reframe &amp; trim</span>
        <button
          type="button"
          onClick={confirm}
          disabled={busy || !ready}
          aria-label="Use clip"
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
          onPointerDown={onStagePointerDown}
          onPointerMove={onStagePointerMove}
          onPointerUp={onStagePointerUp}
          onPointerCancel={onStagePointerUp}
          className="relative mx-auto overflow-hidden rounded-xl bg-black touch-none select-none cursor-move"
          style={
            portrait
              ? { height: "min(48vh, 380px)", aspectRatio: target }
              : { width: "100%", aspectRatio: target || 1 }
          }
        >
          <video
            ref={videoRef}
            src={url}
            muted
            playsInline
            loop
            preload="metadata"
            onLoadedMetadata={onLoadedMetadata}
            onTimeUpdate={onTimeUpdate}
            style={cropStyle(rect)}
          />
        </div>

        {/* Aspect + zoom controls */}
        <div className="w-full max-w-sm space-y-4">
          <div className="grid grid-cols-2 gap-1 rounded-md bg-white/10 p-1">
            {(["original", "square"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={cn(
                  "h-9 rounded text-sm font-medium transition-colors",
                  mode === m ? "bg-accent text-accent-foreground" : "text-white/70"
                )}
              >
                {m === "original" ? "Original" : "Square"}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-3 text-xs text-white/70">
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

          {/* Trim timeline */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-white/70 tabular-nums">
              <span>{fmt(trim.startSec)}</span>
              <span>{fmt(trim.endSec - trim.startSec)} clip</span>
              <span>{fmt(trim.endSec)}</span>
            </div>
            <div
              ref={trackRef}
              className="relative h-10 rounded-lg bg-white/10 touch-none select-none"
            >
              <div
                className="absolute inset-y-0 rounded-lg bg-accent/30 border-y-2 border-accent"
                style={{ left: `${startPct}%`, right: `${100 - endPct}%` }}
              />
              <TrimHandle
                side="start"
                pct={startPct}
                onDown={(e) => {
                  (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                  setScrubbing("start");
                }}
              />
              <TrimHandle
                side="end"
                pct={endPct}
                onDown={(e) => {
                  (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                  setScrubbing("end");
                }}
              />
            </div>
            <p className="text-[11px] text-white/50">
              Drag in the frame to reposition · pinch or the slider to zoom · drag the handles to trim.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrimHandle({
  side,
  pct,
  onDown,
}: {
  side: "start" | "end";
  pct: number;
  onDown: (e: React.PointerEvent) => void;
}) {
  return (
    <button
      type="button"
      role="slider"
      aria-label={side === "start" ? "Trim start" : "Trim end"}
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      onPointerDown={onDown}
      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-12 w-6 flex items-center justify-center rounded-md bg-accent text-accent-foreground outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] touch-none"
      style={{ left: `${pct}%` }}
    >
      <span className="h-5 w-0.5 rounded bg-black/40" />
    </button>
  );
}
