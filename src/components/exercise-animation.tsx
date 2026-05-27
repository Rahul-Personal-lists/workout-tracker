import { cn } from "@/lib/utils";

function frame1(url: string) {
  return url.replace(/\/0\.(jpg|png|webp)$/i, "/1.$1");
}

export function ExerciseAnimation({
  url,
  alt,
  size = 80,
  shape = "square",
  className,
}: {
  url: string | null;
  alt: string;
  size?: number;
  shape?: "square" | "circle";
  className?: string;
}) {
  const radius = shape === "circle" ? "rounded-full" : "rounded";

  if (!url) {
    return (
      <div
        style={{ width: size, height: size }}
        className={cn(
          "shrink-0 bg-neutral-800 border border-neutral-800",
          radius,
          className
        )}
        aria-hidden
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={cn(
        "relative shrink-0 bg-neutral-100 overflow-hidden border border-neutral-800",
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
