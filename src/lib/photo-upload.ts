export const PHOTO_BUCKET = "workout-photos";
export const MAX_PHOTO_BYTES = 25 * 1024 * 1024;

const ALLOWED_EXTS = ["jpg", "jpeg", "png", "webp", "heic", "heif", "gif"];

export function isLikelyImage(file: File): boolean {
  if (file.type && file.type.startsWith("image/")) return true;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return !!ext && ALLOWED_EXTS.includes(ext);
}

export function photoExt(file: File): string {
  return (
    (file.name.split(".").pop() || "jpg")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") || "jpg"
  );
}

export function photoContentType(file: File, ext: string): string {
  return file.type || `image/${ext === "jpg" ? "jpeg" : ext}`;
}
