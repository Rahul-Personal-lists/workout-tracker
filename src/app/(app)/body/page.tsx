import { getBodyLogs } from "@/lib/queries";
import { BodyClient } from "./body-client";

export const dynamic = "force-dynamic";

export default async function BodyPage() {
  const logs = await getBodyLogs();
  return <BodyClient initialLogs={logs} />;
}
