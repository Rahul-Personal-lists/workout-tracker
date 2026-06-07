"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { TopBanner } from "./top-banner";

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
    <TopBanner
      status
      icon={RefreshCw}
      title="Update available"
      subtitle="Refresh to get the latest version"
      actionLabel="Refresh"
      onAction={reload}
      onDismiss={() => setUpdateReady(false)}
      dismissLabel="Dismiss update notification"
    />
  );
}
