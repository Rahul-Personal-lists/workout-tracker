"use client";

import { useEffect } from "react";
import { useRestTimer } from "@/lib/stores/rest-timer";
import {
  planRestNotification,
  REST_NOTIFICATION_ID,
  type RestNotificationAction,
} from "@/lib/native-shell";

// Minimal surface of the Capacitor bridge the native shell injects into the
// page (mobile/ loads this app via server.url). No npm dependency on purpose:
// in a plain browser window.Capacitor is undefined and this component no-ops.
type LocalNotificationsPlugin = {
  createChannel(c: {
    id: string;
    name: string;
    importance: number;
  }): Promise<void>;
  checkPermissions(): Promise<{ display: string }>;
  requestPermissions(): Promise<{ display: string }>;
  schedule(o: {
    notifications: Array<{
      id: number;
      title: string;
      body: string;
      channelId: string;
      schedule: { at: Date; allowWhileIdle: boolean };
    }>;
  }): Promise<unknown>;
  cancel(o: { notifications: Array<{ id: number }> }): Promise<void>;
};
type AppPlugin = {
  addListener(
    ev: "backButton",
    cb: (e: { canGoBack: boolean }) => void
  ): Promise<{ remove(): Promise<void> }>;
  minimizeApp(): Promise<void>;
};

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      Plugins?: {
        LocalNotifications?: LocalNotificationsPlugin;
        App?: AppPlugin;
      };
    };
  }
}

export function NativeShellBridge() {
  useEffect(() => {
    const cap = window.Capacitor;
    if (!cap?.isNativePlatform?.()) return;
    const notifications = cap.Plugins?.LocalNotifications;
    const app = cap.Plugins?.App;
    if (!notifications) return;

    void notifications
      .createChannel({ id: "rest-timer", name: "Rest timer", importance: 5 })
      .catch(() => {});

    let asked = false;
    const ensurePermission = async () => {
      const { display } = await notifications.checkPermissions();
      if (display === "granted") return true;
      if (asked) return false;
      asked = true;
      return (await notifications.requestPermissions()).display === "granted";
    };

    // A failed notification call must never break the timer itself.
    const apply = async (action: RestNotificationAction) => {
      if (action.type === "none") return;
      try {
        await notifications.cancel({
          notifications: [{ id: REST_NOTIFICATION_ID }],
        });
        if (action.type === "schedule" && (await ensurePermission())) {
          await notifications.schedule({
            notifications: [
              {
                id: REST_NOTIFICATION_ID,
                title: "Rest over",
                body: "Back to work",
                channelId: "rest-timer",
                schedule: { at: new Date(action.at), allowWhileIdle: true },
              },
            ],
          });
        }
      } catch {}
    };

    const unsubscribe = useRestTimer.subscribe((state, prev) => {
      void apply(
        planRestNotification(
          { endsAt: prev.endsAt, pausedAt: prev.pausedAt },
          { endsAt: state.endsAt, pausedAt: state.pausedAt },
          Date.now()
        )
      );
    });
    // Catch up on a timer rehydrated from localStorage before this ran.
    const s = useRestTimer.getState();
    void apply(
      planRestNotification(
        { endsAt: null, pausedAt: null },
        { endsAt: s.endsAt, pausedAt: s.pausedAt },
        Date.now()
      )
    );

    const back = app?.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) window.history.back();
      else void app.minimizeApp();
    });

    return () => {
      unsubscribe();
      void back?.then((h) => h.remove());
    };
  }, []);

  return null;
}
