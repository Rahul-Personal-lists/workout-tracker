import { getBodyLogs, getBodyPhotos, getGoalWeight } from "@/lib/queries";
import { BodyClient } from "./body-client";

export const dynamic = "force-dynamic";

export default async function BodyPage() {
  const [logs, photos, goalWeight] = await Promise.all([
    getBodyLogs(),
    getBodyPhotos(),
    getGoalWeight(),
  ]);
  return (
    <BodyClient
      initialLogs={logs}
      initialPhotos={photos}
      goalWeight={goalWeight}
    />
  );
}
