"use client";

import { useEffect, useMemo } from "react";
import { X } from "lucide-react";

export function PhotoThumb({ file, onRemove }: { file: File; onRemove: () => void }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return (
    <div className="relative aspect-square rounded-md overflow-hidden bg-surface border border-border">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="w-full h-full object-cover" />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove photo"
        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/70 text-white flex items-center justify-center outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
