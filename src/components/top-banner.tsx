import { X, type LucideIcon } from "lucide-react";

// Fixed top-of-screen action banner (icon + title/subtitle + primary action +
// dismiss). Shared by the install prompt and the service-worker update notice.
export function TopBanner({
  icon: Icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  onDismiss,
  dismissLabel,
  status = false,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
  onDismiss: () => void;
  dismissLabel: string;
  /** Render as an aria-live status region (for the SW update notice). */
  status?: boolean;
}) {
  return (
    <div
      role={status ? "status" : undefined}
      aria-live={status ? "polite" : undefined}
      className="fixed top-0 inset-x-0 z-50 animate-slide-down pt-[env(safe-area-inset-top)]"
    >
      <div className="mx-auto max-w-md px-3 pt-2 pb-2">
        <div className="flex items-center gap-3 rounded-xl bg-surface border border-border px-4 py-3 shadow-lg">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/15">
            <Icon className="size-5 text-accent" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground leading-tight">
              {title}
            </p>
            <p className="text-xs text-foreground-muted mt-0.5 truncate">
              {subtitle}
            </p>
          </div>

          <button
            onClick={onAction}
            className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-[length:var(--focus-ring-width)] focus-visible:ring-offset-[length:var(--focus-ring-offset)] focus-visible:ring-[color:var(--focus-ring-color)]"
          >
            {actionLabel}
          </button>

          <button
            onClick={onDismiss}
            aria-label={dismissLabel}
            className="shrink-0 -mr-1 p-1 rounded-md text-foreground-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-[length:var(--focus-ring-width)] focus-visible:ring-offset-[length:var(--focus-ring-offset)] focus-visible:ring-[color:var(--focus-ring-color)]"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
