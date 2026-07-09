// In-memory memo for Supabase storage signed URLs. Stable URLs across renders
// let the browser image cache actually hit; a fresh serverless instance just
// re-signs. The signer is injected so this stays runnable under plain tsx.
export type SignBatch = (
  paths: string[],
  ttlSeconds: number
) => Promise<(string | null)[]>;

type Entry = { url: string; expiresAtMs: number };

const MAX_ENTRIES = 1000;
// Reuse while >25% of the TTL remains; past that, re-sign so a URL handed to
// the client never arrives nearly expired.
const REFRESH_FRACTION = 0.25;

const cache = new Map<string, Entry>();

export function clearSignedUrlCache(): void {
  cache.clear();
}

export async function getSignedUrlsCached(opts: {
  bucket: string;
  paths: string[];
  ttlSeconds: number;
  sign: SignBatch;
  now?: () => number;
}): Promise<(string | null)[]> {
  const { bucket, paths, ttlSeconds, sign } = opts;
  const now = opts.now ?? Date.now;
  const ttlMs = ttlSeconds * 1000;

  const out: (string | null)[] = new Array(paths.length).fill(null);
  const missIdx: number[] = [];

  paths.forEach((path, i) => {
    const entry = cache.get(`${bucket}:${path}`);
    if (entry && entry.expiresAtMs - now() > ttlMs * REFRESH_FRACTION) {
      out[i] = entry.url;
    } else {
      missIdx.push(i);
    }
  });

  if (missIdx.length > 0) {
    const fresh = await sign(missIdx.map((i) => paths[i]), ttlSeconds);
    const expiresAtMs = now() + ttlMs;
    missIdx.forEach((pathIdx, j) => {
      const url = fresh[j] ?? null;
      out[pathIdx] = url;
      if (url) {
        const key = `${bucket}:${paths[pathIdx]}`;
        cache.delete(key); // re-insert so iteration order tracks recency
        cache.set(key, { url, expiresAtMs });
        if (cache.size > MAX_ENTRIES) {
          const oldest = cache.keys().next().value;
          if (oldest !== undefined) cache.delete(oldest);
        }
      }
    });
  }

  return out;
}
