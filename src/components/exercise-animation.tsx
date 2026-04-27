import { cn } from "@/lib/utils";

function frame1(url: string) {
  return url.replace(/\/0\.(jpg|png|webp)$/i, "/1.$1");
}

export function ExerciseAnimation({
  url,
  alt,
  size = 80,
  className,
}: {
  url: string | null;
  alt: string;
  size?: number;
  className?: string;
}) {
  if (!url) {
    return (
      <div
        style={{ width: size, height: size }}
        className={cn(
          "shrink-0 rounded bg-neutral-800 border border-neutral-800",
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
        "relative shrink-0 rounded bg-neutral-100 overflow-hidden border border-neutral-800",
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
