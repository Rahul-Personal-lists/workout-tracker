import { cn } from "@/lib/utils";

function frame1(url: string) {
  return url.replace(/\/0\.(jpg|png|webp)$/i, "/1.$1");
}

export function ExerciseAnimation({
  url,
  alt,
  size = 80,
  shape = "square",
  fill = false,
  className,
}: {
  url: string | null;
  alt: string;
  size?: number;
  shape?: "square" | "circle";
  // Fill the parent (w/h 100%) instead of a fixed `size` — for the catalog grid
  // cards, which size the image via an aspect-square wrapper.
  fill?: boolean;
  className?: string;
}) {
  const radius = shape === "circle" ? "rounded-full" : "rounded";
  const sizeStyle = fill ? undefined : { width: size, height: size };
  const fillBox = fill ? "w-full h-full" : "shrink-0";

  if (!url) {
    return (
      <div
        style={sizeStyle}
        className={cn(
          "bg-surface-hover border border-border",
          fillBox,
          radius,
          className
        )}
        aria-hidden
      />
    );
  }

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
        src={url}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={frame1(url)}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover animate-exercise-flip"
      />
    </div>
  );
}
