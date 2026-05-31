"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { LogoKettlePop } from "./logo-kettle-pop";
import { BrandWordmark } from "./brand-wordmark";

// Branded launch splash. Mounted once in the root layout, so it appears on a
// genuine app open / hard refresh (cold boot, or the post-login hard nav) and
// stays put across in-app client navigations. The logo + wordmark animate in,
// then the whole layer fades and unmounts — the underlying page is already in
// the DOM beneath it. aria-hidden so it never traps screen-reader focus.
const SPLASH_VISIBLE_MS = 950;
const SPLASH_FADE_MS = 450;

export function AppSplash() {
  const [phase, setPhase] = useState<"visible" | "leaving" | "gone">("visible");

  useEffect(() => {
    const toLeaving = setTimeout(() => setPhase("leaving"), SPLASH_VISIBLE_MS);
    const toGone = setTimeout(
      () => setPhase("gone"),
      SPLASH_VISIBLE_MS + SPLASH_FADE_MS
    );
    return () => {
      clearTimeout(toLeaving);
      clearTimeout(toGone);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      aria-hidden="true"
      className={cn(
        // Purely decorative + aria-hidden: never capture pointer events, so the
        // page beneath is interactive from first paint while the splash fades.
        "fixed inset-0 z-[60] pointer-events-none flex flex-col items-center justify-center gap-5 bg-black transition-opacity",
        phase === "leaving" ? "opacity-0" : "opacity-100"
      )}
      style={{ transitionDuration: `${SPLASH_FADE_MS}ms` }}
    >
      <div className="animate-logo-enter">
        <LogoKettlePop size={88} />
      </div>
      <h1 className="text-2xl font-semibold animate-title-enter">
        <BrandWordmark />
      </h1>
    </div>
  );
}
