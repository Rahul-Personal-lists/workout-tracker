import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SettingsReplayTutorials } from "@/components/settings-replay-tutorials";

export default function HelpPage() {
  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <Link
          href="/settings"
          aria-label="Back to settings"
          className="h-9 w-9 rounded-full flex items-center justify-center border border-border bg-surface text-foreground-muted hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-semibold">Help</h1>
      </header>
      <SettingsReplayTutorials />
    </div>
  );
}
