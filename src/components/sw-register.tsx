"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";

export function ServiceWorkerRegister() {
  // True once a new SW has installed while an older one still controls the
  // page — i.e. a fresh deploy is ready but the open session is still running
  // the previous build. We surface a passive banner instead of auto-reloading:
  // a forced reload mid-set would discard in-progress workout form state.
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;
    let cleanupVisibility: (() => void) | undefined;

    function trackInstalling(worker: ServiceWorker) {
      worker.addEventListener("statechange", () => {
        // controller present → this is an update, not the first install.
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          setUpdateReady(true);
        }
      });
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        if (cancelled) return;

        if (registration.waiting && navigator.serviceWorker.controller) {
          setUpdateReady(true);
        }
        if (registration.installing) trackInstalling(registration.installing);
        registration.addEventListener("updatefound", () => {
          if (registration.installing) trackInstalling(registration.installing);
        });

        // Browsers only check for a new SW on navigation and at most ~daily.
        // An installed PWA is resumed far more often than it cold-loads, so
        // re-check whenever the app comes back to the foreground.
        const onVisible = () => {
          if (document.visibilityState === "visible") {
            registration.update().catch(() => {});
          }
        };
        document.addEventListener("visibilitychange", onVisible);
        cleanupVisibility = () =>
          document.removeEventListener("visibilitychange", onVisible);
      })
      .catch((err) => {
        console.warn("SW registration failed", err);
      });

    return () => {
      cancelled = true;
      cleanupVisibility?.();
    };
  }, []);

  const reload = useCallback(() => {
    window.location.reload();
  }, []);

  if (!updateReady) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 inset-x-0 z-50 animate-slide-down pt-[env(safe-area-inset-top)]"
    >
      <div className="mx-auto max-w-md px-3 pt-2 pb-2">
        <div className="flex items-center gap-3 rounded-xl bg-surface border border-border px-4 py-3 shadow-lg">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/15">
            <RefreshCw className="size-5 text-accent" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground leading-tight">
              Update available
            </p>
            <p className="text-xs text-foreground-muted mt-0.5 truncate">
              Refresh to get the latest version
            </p>
          </div>

          <button
            onClick={reload}
            className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-[length:var(--focus-ring-width)] focus-visible:ring-offset-[length:var(--focus-ring-offset)] focus-visible:ring-[color:var(--focus-ring-color)]"
          >
            Refresh
          </button>

          <button
            onClick={() => setUpdateReady(false)}
            aria-label="Dismiss update notification"
            className="shrink-0 -mr-1 p-1 rounded-md text-foreground-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-[length:var(--focus-ring-width)] focus-visible:ring-offset-[length:var(--focus-ring-offset)] focus-visible:ring-[color:var(--focus-ring-color)]"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
