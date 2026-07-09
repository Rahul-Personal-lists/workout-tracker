import {
  clearSignedUrlCache,
  getSignedUrlsCached,
} from "../src/lib/signed-url-cache";

let failures = 0;
let caseNo = 0;
function check(name: string, cond: boolean) {
  caseNo += 1;
  if (cond) console.log(`ok ${caseNo} - ${name}`);
  else {
    failures += 1;
    console.error(`FAIL ${caseNo} - ${name}`);
  }
}

function makeSigner() {
  const calls: string[][] = [];
  return {
    calls,
    sign: async (paths: string[]) => {
      calls.push([...paths]);
      return paths.map((p) => (p === "missing" ? null : `signed:${p}:${calls.length}`));
    },
  };
}

async function main() {
  const TTL = 100; // seconds
  let nowMs = 1_000_000;
  const now = () => nowMs;

  // 1–2: first call signs everything, in order
  clearSignedUrlCache();
  const s1 = makeSigner();
  const first = await getSignedUrlsCached({
    bucket: "b",
    paths: ["a", "c"],
    ttlSeconds: TTL,
    sign: s1.sign,
    now,
  });
  check(
    "first call returns urls in input order",
    first[0] === "signed:a:1" && first[1] === "signed:c:1"
  );
  check("first call hits the signer once", s1.calls.length === 1);

  // 3–4: second call inside the fresh window is a pure memo hit
  const second = await getSignedUrlsCached({
    bucket: "b",
    paths: ["a", "c"],
    ttlSeconds: TTL,
    sign: s1.sign,
    now,
  });
  check(
    "memo hit returns identical urls",
    second[0] === first[0] && second[1] === first[1]
  );
  check("memo hit does not call the signer", s1.calls.length === 1);

  // 5–6: partial miss signs only the new path, order preserved
  const third = await getSignedUrlsCached({
    bucket: "b",
    paths: ["d", "a"],
    ttlSeconds: TTL,
    sign: s1.sign,
    now,
  });
  check(
    "partial miss signs only the missing path",
    s1.calls.length === 2 && s1.calls[1].join(",") === "d"
  );
  check(
    "partial miss preserves order (fresh, cached)",
    third[0] === "signed:d:2" && third[1] === "signed:a:1"
  );

  // 7: past 75% of TTL the entry refreshes
  nowMs += TTL * 1000 * 0.8;
  await getSignedUrlsCached({
    bucket: "b",
    paths: ["a"],
    ttlSeconds: TTL,
    sign: s1.sign,
    now,
  });
  check("entry past 75% of TTL re-signs", s1.calls.length === 3);

  // 8: null results are returned but never cached
  const s2 = makeSigner();
  clearSignedUrlCache();
  const n1 = await getSignedUrlsCached({
    bucket: "b",
    paths: ["missing"],
    ttlSeconds: TTL,
    sign: s2.sign,
    now,
  });
  await getSignedUrlsCached({
    bucket: "b",
    paths: ["missing"],
    ttlSeconds: TTL,
    sign: s2.sign,
    now,
  });
  check(
    "null result returned and retried next call",
    n1[0] === null && s2.calls.length === 2
  );

  // 9: same path, different bucket = distinct entries
  const s3 = makeSigner();
  clearSignedUrlCache();
  await getSignedUrlsCached({ bucket: "b1", paths: ["x"], ttlSeconds: TTL, sign: s3.sign, now });
  await getSignedUrlsCached({ bucket: "b2", paths: ["x"], ttlSeconds: TTL, sign: s3.sign, now });
  check("bucket is part of the cache key", s3.calls.length === 2);

  // 10: eviction keeps the map bounded (cap 1000)
  const s4 = makeSigner();
  clearSignedUrlCache();
  const many = Array.from({ length: 1001 }, (_, i) => `p${i}`);
  await getSignedUrlsCached({ bucket: "b", paths: many, ttlSeconds: TTL, sign: s4.sign, now });
  await getSignedUrlsCached({ bucket: "b", paths: ["p0"], ttlSeconds: TTL, sign: s4.sign, now });
  check(
    "oldest entry evicted past 1000 and re-signed",
    s4.calls.length === 2 && s4.calls[1].join(",") === "p0"
  );

  console.log(
    failures === 0
      ? `smoke-signed-url-cache: ${caseNo}/${caseNo} passed`
      : `${failures} FAILED`
  );
  process.exit(failures === 0 ? 0 : 1);
}

main();
