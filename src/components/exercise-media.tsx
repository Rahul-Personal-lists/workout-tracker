import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExerciseAnimation } from "./exercise-animation";

// Thumbnail renderer that branches on media kind. A `poster` (signed URL of the
// extracted frame) marks a video exercise: we show the still + a small play
// affordance, never a live <video> in a small cell. Otherwise it falls through
// to the normal image flip. Drop-in for ExerciseAnimation at thumbnail sites.
export function ExerciseMedia({
  imageUrl,
  poster,
  alt,
  size = 80,
  shape = "square",
  fill = false,
  className,
}: {
  imageUrl: string | null;
  poster: string | null;
  alt: string;
  size?: number;
  shape?: "square" | "circle";
  fill?: boolean;
  className?: string;
}) {
  if (!poster) {
    return (
      <ExerciseAnimation
        url={imageUrl}
        alt={alt}
        size={size}
        shape={shape}
        fill={fill}
        className={className}
      />
    );
  }

  const radius = shape === "circle" ? "rounded-full" : "rounded";
  const sizeStyle = fill ? undefined : { width: size, height: size };
  const fillBox = fill ? "w-full h-full" : "shrink-0";

  return (
    <div
      style={sizeStyle}
      className={cn(
        "relative bg-neutral-100 overflow-hidden border border-border",
        fillBox,
        radius,
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={poster}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <span
        aria-hidden
        className="absolute inset-0 flex items-center justify-center"
      >
        <span
          className="flex items-center justify-center rounded-full bg-black/55 text-white"
          style={{ height: "34%", aspectRatio: "1" }}
        >
          <Play className="w-1/2 h-1/2" fill="currentColor" />
        </span>
      </span>
    </div>
  );
}
