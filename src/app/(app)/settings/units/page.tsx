import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getProfile } from "@/lib/queries";
import { UnitsClient } from "./units-client";

export default async function UnitsPage() {
  // Read from the DB (getProfile) for one source of truth — matches the hub and
  // every other screen. The cookie is only a fast-write mirror, not canonical.
  const { units } = await getProfile();
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
        <h1 className="text-xl font-semibold">Units</h1>
      </header>
      <UnitsClient initialUnits={units} />
    </div>
  );
}
