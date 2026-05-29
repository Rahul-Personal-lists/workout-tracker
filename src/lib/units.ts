export type Units = "imperial" | "metric";

export const UNITS_COOKIE = "units";
export const SOUND_PREFS_COOKIE = "sound-prefs";

export function isUnits(value: unknown): value is Units {
  return value === "imperial" || value === "metric";
}

export function getUnitsFromCookie(): Units {
  if (typeof document === "undefined") return "imperial";
  const m = document.cookie.match(/(?:^|;\s*)units=([^;]+)/);
  const raw = m?.[1];
  return isUnits(raw) ? raw : "imperial";
}

export type SoundPrefs = {
  soundLeadSeconds: number | null;
  vibrationLeadSeconds: number | null;
};

export function getSoundPrefsFromCookie(): SoundPrefs {
  if (typeof document === "undefined") {
    return { soundLeadSeconds: null, vibrationLeadSeconds: null };
  }
  const m = document.cookie.match(/(?:^|;\s*)sound-prefs=([^;]+)/);
  const raw = m?.[1];
  if (!raw) return { soundLeadSeconds: null, vibrationLeadSeconds: null };
  const [s, v] = raw.split("|");
  return {
    soundLeadSeconds: parseLeadPart(s),
    vibrationLeadSeconds: parseLeadPart(v),
  };
}

function parseLeadPart(value: string | undefined): number | null {
  if (value === "0") return 0;
  if (value === "5") return 5;
  return null;
}

export function serializeSoundPrefs(prefs: SoundPrefs): string {
  return `${prefs.soundLeadSeconds ?? "off"}|${prefs.vibrationLeadSeconds ?? "off"}`;
}
