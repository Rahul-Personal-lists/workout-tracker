import { getBodyLogs, getBodyPhotos, getGoalWeight } from "@/lib/queries";
import { getUnitsServer } from "@/lib/units-server";
import { BodyClient } from "./body-client";

export const dynamic = "force-dynamic";

export default async function BodyPage() {
  const [logs, photos, goalWeight, units] = await Promise.all([
    getBodyLogs(),
    getBodyPhotos(),
    getGoalWeight(),
    getUnitsServer(),
  ]);
  return (
    <BodyClient
      initialLogs={logs}
      initialPhotos={photos}
      goalWeight={goalWeight}
      units={units}
    />
  );
}
