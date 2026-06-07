import type { createClient } from "@/lib/supabase/client";
import {
  MAX_PHOTO_BYTES,
  PHOTO_BUCKET,
  isLikelyImage,
  photoContentType,
  photoExt,
} from "@/lib/photo-upload";

type BrowserClient = ReturnType<typeof createClient>;

// Validate + upload a batch of image files to the photo bucket. The caller builds
// each storage path via pathFor(ext) and owns DB recording + messaging afterward.
// Returns the successful paths plus a failure count + first error so callers can
// surface partial success (workout) or a single error string (body) as they like.
export async function uploadImageFiles(
  supabase: BrowserClient,
  files: File[],
  pathFor: (ext: string) => string,
): Promise<{ uploadedPaths: string[]; failed: number; firstError: string | null }> {
  const uploadedPaths: string[] = [];
  let failed = 0;
  let firstError: string | null = null;

  for (const file of files) {
    try {
      if (file.size > MAX_PHOTO_BYTES) {
        const mb = (file.size / 1024 / 1024).toFixed(1);
        throw new Error(`Photo too large (${mb} MB). Max is 25 MB.`);
      }
      if (!isLikelyImage(file)) {
        throw new Error(`Unsupported file: ${file.name || "(unnamed)"}`);
      }
      const ext = photoExt(file);
      const contentType = photoContentType(file, ext);
      const path = pathFor(ext);
      const { error: upErr } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, file, { contentType, upsert: false });
      if (upErr) throw upErr;
      uploadedPaths.push(path);
    } catch (err) {
      failed += 1;
      if (firstError === null) {
        firstError = err instanceof Error ? err.message : "Photo upload failed";
      }
    }
  }

  return { uploadedPaths, failed, firstError };
}
