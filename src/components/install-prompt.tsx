"use client";

import { useEffect, useState, useCallback } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "install-prompt-dismissed";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed && Date.now() - Number(dismissed) < DISMISS_DURATION_MS) {
      return;
    }

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setDeferredPrompt(null);
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-50 safe-top animate-slide-down">
      <div className="mx-auto max-w-md px-3 pt-2 pb-2">
        <div className="flex items-center gap-3 rounded-xl bg-surface border border-border px-4 py-3 shadow-lg">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/15">
            <Download className="size-5 text-accent" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground leading-tight">
              Install Workout Tracker
            </p>
            <p className="text-xs text-foreground-muted mt-0.5 truncate">
              Add to home screen for the full experience
            </p>
          </div>

          <button
            onClick={handleInstall}
            className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-[length:var(--focus-ring-width)] focus-visible:ring-offset-[length:var(--focus-ring-offset)] focus-visible:ring-[color:var(--focus-ring-color)]"
          >
            Install
          </button>

          <button
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
            className="shrink-0 -mr-1 p-1 rounded-md text-foreground-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-[length:var(--focus-ring-width)] focus-visible:ring-offset-[length:var(--focus-ring-offset)] focus-visible:ring-[color:var(--focus-ring-color)]"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
