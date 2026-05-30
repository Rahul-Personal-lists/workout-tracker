export type Units = "imperial" | "metric";

export function isUnits(value: unknown): value is Units {
  return value === "imperial" || value === "metric";
}
