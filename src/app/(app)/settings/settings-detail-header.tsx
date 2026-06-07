import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Back-to-settings header shared by every settings detail page.
export function SettingsDetailHeader({ title }: { title: string }) {
  return (
    <header className="flex items-center gap-3">
      <Link
        href="/settings"
        aria-label="Back to settings"
        className="h-9 w-9 rounded-full flex items-center justify-center border border-border bg-surface text-foreground-muted hover:text-foreground outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
      >
        <ArrowLeft className="w-4 h-4" />
      </Link>
      <h1 className="text-xl font-semibold">{title}</h1>
    </header>
  );
}
