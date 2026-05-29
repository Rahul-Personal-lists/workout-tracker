import {
  getBodyLogs,
  getBodyMeasurements,
  getBodyPhotos,
  getGoalWeight,
} from "@/lib/queries";
import { getUnitsServer } from "@/lib/units-server";
import { BodyClient } from "./body-client";

export const dynamic = "force-dynamic";

export default async function BodyPage() {
  const [logs, measurements, photos, goalWeight, units] = await Promise.all([
    getBodyLogs(),
    getBodyMeasurements(),
    getBodyPhotos(),
    getGoalWeight(),
    getUnitsServer(),
  ]);
  return (
    <BodyClient
      initialLogs={logs}
      initialMeasurements={measurements}
      initialPhotos={photos}
      goalWeight={goalWeight}
      units={units}
    />
  );
}
