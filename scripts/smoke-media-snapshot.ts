// Smoke test for the storage-path snapshot validator (src/lib/media-snapshot.ts)
// shared by createCustomExercise and addExerciseToProgram.
// Run: npx tsx scripts/smoke-media-snapshot.ts
import { mediaSnapshotError } from "@/lib/media-snapshot";

const UID = "11111111-1111-1111-1111-111111111111";
const CID = "22222222-2222-2222-2222-222222222222";
const dir = `${UID}/exercise-videos/${CID}`;

let failures = 0;
function expect(label: string, got: string | null, wantOk: boolean) {
  const ok = got === null;
  if (ok !== wantOk) {
    failures++;
    console.error(`  ✗ ${label}: ${wantOk ? "expected OK" : "expected error"}, got ${got ?? "OK"}`);
  } else {
    console.log(`  ✓ ${label}`);
  }
}

// Catalog exercise — no media at all → OK.
expect("catalog (all null)", mediaSnapshotError(UID, { customExerciseId: null, videoPath: null, posterPath: null }), true);
// Video + poster, matched prefix → OK.
expect("video+poster matched", mediaSnapshotError(UID, { customExerciseId: CID, videoPath: `${dir}/source.mp4`, posterPath: `${dir}/poster.jpg` }), true);
// Poster-only (photo) matched prefix → OK (the new case).
expect("poster-only matched", mediaSnapshotError(UID, { customExerciseId: CID, videoPath: null, posterPath: `${dir}/poster.jpg` }), true);
// Poster present but no custom id → error.
expect("poster, no id", mediaSnapshotError(UID, { customExerciseId: null, videoPath: null, posterPath: `${dir}/poster.jpg` }), false);
// Video present but poster missing → error.
expect("video, no poster", mediaSnapshotError(UID, { customExerciseId: CID, videoPath: `${dir}/source.mp4`, posterPath: null }), false);
// Cross-user poster path → error.
expect("cross-user poster", mediaSnapshotError(UID, { customExerciseId: CID, videoPath: null, posterPath: `99999999-9999-9999-9999-999999999999/exercise-videos/${CID}/poster.jpg` }), false);
// Mismatched custom id in path → error.
expect("mismatched id", mediaSnapshotError(UID, { customExerciseId: CID, videoPath: null, posterPath: `${UID}/exercise-videos/33333333-3333-3333-3333-333333333333/poster.jpg` }), false);
// Video path outside owner folder but poster fine → error.
expect("video outside folder", mediaSnapshotError(UID, { customExerciseId: CID, videoPath: `someoneelse/source.mp4`, posterPath: `${dir}/poster.jpg` }), false);

if (failures > 0) {
  console.error(`\n✗ media-snapshot smoke: ${failures} failure(s)`);
  process.exit(1);
}
console.log("\n✓ media-snapshot smoke: poster-only allowed; cross-user/mismatched/missing-poster rejected");
