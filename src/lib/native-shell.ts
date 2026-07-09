// Pure decision logic for the native shell's rest-timer notification, kept
// out of the bridge component so it can be smoke-tested without Capacitor.
export const REST_NOTIFICATION_ID = 4477;

export type RestSnapshot = {
  endsAt: number | null;
  pausedAt: number | null;
};

export type RestNotificationAction =
  | { type: "schedule"; at: number }
  | { type: "cancel" }
  | { type: "none" };

export function planRestNotification(
  prev: RestSnapshot,
  next: RestSnapshot,
  now: number
): RestNotificationAction {
  const wasActive = prev.endsAt !== null && prev.pausedAt === null;
  const isActive =
    next.endsAt !== null && next.pausedAt === null && next.endsAt > now;
  if (isActive) {
    if (!wasActive || prev.endsAt !== next.endsAt)
      return { type: "schedule", at: next.endsAt as number };
    return { type: "none" };
  }
  if (wasActive) return { type: "cancel" };
  return { type: "none" };
}
