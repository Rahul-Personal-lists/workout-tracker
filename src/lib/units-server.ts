import "server-only";

import { cookies } from "next/headers";
import { isUnits, type Units } from "./units";

export async function getUnitsServer(): Promise<Units> {
  const store = await cookies();
  const raw = store.get("units")?.value;
  return isUnits(raw) ? raw : "imperial";
}
