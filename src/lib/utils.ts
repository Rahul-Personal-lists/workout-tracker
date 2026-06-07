import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Canonical keyboard focus ring. References the --focus-ring-* tokens so accent
// theme-switching works; the outline spelling follows the element's radius and
// is the dominant style across the app. Use on any custom-focusable control.
export const FOCUS_RING =
  "outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]";
