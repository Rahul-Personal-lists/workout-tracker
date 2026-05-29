import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CommonProps = {
  icon?: ReactNode;
  label: string;
  rightLabel?: ReactNode;
};

type LinkRowProps = CommonProps & {
  href: string;
  className?: string;
};

type StaticRowProps = CommonProps & {
  className?: string;
};

export function SettingsRow({
  icon,
  label,
  rightLabel,
  href,
  className,
}: LinkRowProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-4 h-14 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] hover:bg-surface-hover/40 transition-colors",
        className
      )}
    >
      {icon ? (
        <span
          aria-hidden="true"
          className="w-5 h-5 flex items-center justify-center text-foreground-muted"
        >
          {icon}
        </span>
      ) : null}
      <span className="flex-1 text-foreground">{label}</span>
      {rightLabel ? (
        <span className="text-foreground-muted text-sm tabular-nums">
          {rightLabel}
        </span>
      ) : null}
      <ChevronRight
        aria-hidden="true"
        className="w-4 h-4 text-foreground-muted"
      />
    </Link>
  );
}

export function SettingsStaticRow({
  icon,
  label,
  rightLabel,
  className,
}: StaticRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 h-14 text-sm",
        className
      )}
    >
      {icon ? (
        <span
          aria-hidden="true"
          className="w-5 h-5 flex items-center justify-center text-foreground-muted"
        >
          {icon}
        </span>
      ) : null}
      <span className="flex-1 text-foreground">{label}</span>
      {rightLabel ? (
        <span className="text-foreground-muted text-sm tabular-nums">
          {rightLabel}
        </span>
      ) : null}
    </div>
  );
}

export function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <p className="text-xs uppercase tracking-wide text-foreground-muted px-1">
        {title}
      </p>
      <div className="rounded-lg border border-border bg-surface divide-y divide-[color:var(--color-border)]">
        {children}
      </div>
    </section>
  );
}
