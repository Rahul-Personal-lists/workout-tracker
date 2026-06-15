// Smoke test for the shared reframe geometry (src/lib/reframe.ts) used by both
// VideoCropper and ImageReframer. Asserts the centered square-crop rect for
// known source aspects, the zoom scaling, and clamping.
// Run: npx tsx scripts/smoke-reframe.ts
import { baseDims, rectFor, clampView, MAX_ZOOM } from "@/lib/reframe";

let failures = 0;
function near(label: string, got: number, want: number, eps = 1e-9) {
  if (Math.abs(got - want) > eps) {
    failures++;
    console.error(`  ✗ ${label}: got ${got}, want ${want}`);
  } else {
    console.log(`  ✓ ${label} = ${got.toFixed(4)}`);
  }
}

// Square crop in a 16:9 (1.7778) source → height-limited.
{
  const { baseW, baseH } = baseDims(1, 16 / 9);
  near("16:9 baseW", baseW, 9 / 16);
  near("16:9 baseH", baseH, 1);
}
// Square crop in a 9:16 portrait source → width-limited.
{
  const { baseW, baseH } = baseDims(1, 9 / 16);
  near("9:16 baseW", baseW, 1);
  near("9:16 baseH", baseH, 9 / 16);
}
// Square crop in a square source → full frame.
{
  const r = rectFor(1, 1, 1, { cx: 0.5, cy: 0.5 });
  near("square x", r.x, 0);
  near("square y", r.y, 0);
  near("square w", r.w, 1);
  near("square h", r.h, 1);
}
// 16:9 source, zoom 1, centered → centered tall square.
{
  const r = rectFor(1, 16 / 9, 1, { cx: 0.5, cy: 0.5 });
  near("16:9 z1 w", r.w, 9 / 16);
  near("16:9 z1 h", r.h, 1);
  near("16:9 z1 x", r.x, (1 - 9 / 16) / 2);
  near("16:9 z1 y", r.y, 0);
}
// Zoom 2 halves crop dims.
{
  const r = rectFor(1, 16 / 9, 2, { cx: 0.5, cy: 0.5 });
  near("16:9 z2 w", r.w, 9 / 32);
  near("16:9 z2 h", r.h, 0.5);
}
// clampView: zoom clamps to [1, MAX_ZOOM]; center clamps to keep crop inside.
{
  const v = clampView(1, 16 / 9, 99, { cx: -1, cy: -1 });
  near("clamp zoom", v.zoom, MAX_ZOOM);
  const cw = 9 / 16 / MAX_ZOOM;
  const ch = 1 / MAX_ZOOM;
  near("clamp cx", v.center.cx, cw / 2);
  near("clamp cy", v.center.cy, ch / 2);
}

if (failures > 0) {
  console.error(`\n✗ reframe smoke: ${failures} failure(s)`);
  process.exit(1);
}
console.log("\n✓ reframe smoke: square-crop geometry, zoom scaling, and clamping all correct");
