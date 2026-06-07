import { getProfile } from "@/lib/queries";
import { SettingsDetailHeader } from "../settings-detail-header";
import { UnitsClient } from "./units-client";

export default async function UnitsPage() {
  // Read from the DB (getProfile) for one source of truth — matches the hub and
  // every other screen. The cookie is only a fast-write mirror, not canonical.
  const { units } = await getProfile({ signAvatar: false });
  return (
    <div className="space-y-5">
      <SettingsDetailHeader title="Units" />
      <UnitsClient initialUnits={units} />
    </div>
  );
}
