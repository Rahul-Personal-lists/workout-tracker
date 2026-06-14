// Smoke test for the interactive body-map tap targets (src/components/interactive-body-figure.tsx).
//
// Regression guard for the biceps→abs bug: callout hit areas used to be one box
// spanning dot→label, which overlapped neighbours so the topmost (last-painted)
// callout stole taps. Each callout now owns two DISJOINT hit shapes — a circle
// on its dot and a rect on its label. This script replicates that geometry and
// asserts that a tap on any dot or label resolves to its OWN muscle, that a
// finger-sized neighbourhood around each dot never resolves to a different
// muscle, and that no two callouts' hit shapes overlap.
//
// Run: npx tsx scripts/smoke-body-map.ts

type View = "front" | "back";
type Callout = { key: string; x: number; y: number; lx?: number; label: string };

const IMG: Record<View, { w: number; h: number }> = {
  front: { w: 941, h: 1372 },
  back: { w: 843, h: 1270 },
};

const LEFT_LABEL_PCT = 27;
const RIGHT_LABEL_PCT = 73;
const SLOT_TOP = 13;
const SLOT_BOTTOM = 87;

// Mirrors LAYOUT + labelFor() in the component (labels via regionLabel / "Cardio").
const LAYOUT: Record<View, { left: Callout[]; right: Callout[] }> = {
  front: {
    left: [
      { key: "shoulders", x: 37, y: 23, label: "Shoulders" },
      { key: "chest", x: 44, y: 25, label: "Chest" },
      { key: "forearms", x: 30, y: 43, label: "Forearms" },
      { key: "quads", x: 43, y: 64, label: "Quads" },
    ],
    right: [
      { key: "cardio", x: 56, y: 24, label: "Cardio" },
      { key: "biceps", x: 67, y: 30, label: "Biceps" },
      { key: "abs", x: 50, y: 38, label: "Abs" },
      { key: "adductors", x: 54, y: 66, label: "Adductors" },
    ],
  },
  back: {
    left: [
      { key: "lats", x: 40, y: 29, label: "Lats" },
      { key: "hamstrings", x: 44, y: 64, label: "Hamstrings" },
      { key: "calves", x: 40, y: 78, label: "Calves" },
    ],
    right: [
      { key: "traps", x: 50, y: 18, label: "Traps" },
      { key: "triceps", x: 68, y: 30, lx: 78, label: "Triceps" },
      { key: "lower_back", x: 50, y: 40, label: "Lower Back" },
      { key: "glutes", x: 58, y: 52, label: "Glutes" },
    ],
  },
};

function slotYPct(index: number, count: number) {
  if (count <= 1) return (SLOT_TOP + SLOT_BOTTOM) / 2;
  return SLOT_TOP + ((SLOT_BOTTOM - SLOT_TOP) * index) / (count - 1);
}

type Shape = {
  key: string;
  label: string;
  cx: number;
  cy: number;
  dotR: number;
  labelX: number;
  labelY: number;
  rx: number;
  ry: number;
  rw: number;
  rh: number;
};

// Build the painted, ordered list of callouts for a view ([...left, ...right],
// later index = painted on top), with each callout's two hit shapes.
function buildShapes(view: View): Shape[] {
  const img = IMG[view];
  const vx = (pct: number) => (pct / 100) * img.w;
  const vy = (pct: number) => (pct / 100) * img.h;
  const { left, right } = LAYOUT[view];
  const make = (c: Callout, index: number, count: number, side: "left" | "right"): Shape => {
    const labelX = vx(c.lx ?? (side === "left" ? LEFT_LABEL_PCT : RIGHT_LABEL_PCT));
    const labelY = vy(slotYPct(index, count));
    const cx = vx(c.x);
    const cy = vy(c.y);
    const dotR = vy(2.4);
    const labelPad = vy(1.5);
    const labelW = c.label.length * vy(1.5) + labelPad * 2;
    const rx = side === "left" ? labelX - labelW + labelPad : labelX - labelPad;
    const ry = labelY - vy(2.5);
    return { key: c.key, label: c.label, cx, cy, dotR, labelX, labelY, rx, ry, rw: labelW, rh: vy(5) };
  };
  return [
    ...left.map((c, i) => make(c, i, left.length, "left")),
    ...right.map((c, i) => make(c, i, right.length, "right")),
  ];
}

function inDot(s: Shape, px: number, py: number) {
  return (px - s.cx) ** 2 + (py - s.cy) ** 2 <= s.dotR ** 2;
}
function inRect(s: Shape, px: number, py: number) {
  return px >= s.rx && px <= s.rx + s.rw && py >= s.ry && py <= s.ry + s.rh;
}

// Resolve a tap exactly as SVG does: among all callouts whose dot OR label
// contains the point, the one painted last (highest index) wins.
function resolveTap(shapes: Shape[], px: number, py: number): string | null {
  let winner: string | null = null;
  for (const s of shapes) {
    if (inDot(s, px, py) || inRect(s, px, py)) winner = s.key;
  }
  return winner;
}

// Two circles overlap if centre distance < sum of radii.
function circlesOverlap(a: Shape, b: Shape) {
  return Math.hypot(a.cx - b.cx, a.cy - b.cy) < a.dotR + b.dotR;
}
function rectsOverlap(a: Shape, b: Shape) {
  return a.rx < b.rx + b.rw && a.rx + a.rw > b.rx && a.ry < b.ry + b.rh && a.ry + a.rh > b.ry;
}
function rectContainsDot(rect: Shape, dot: Shape) {
  return inRect(rect, dot.cx, dot.cy);
}

let failures = 0;
const fail = (msg: string) => {
  failures++;
  console.error("  ✗ " + msg);
};

for (const view of ["front", "back"] as View[]) {
  const shapes = buildShapes(view);
  console.log(`\n[${view}] ${shapes.length} callouts`);

  // 1. Tapping each dot centre and each label centre resolves to its own key.
  for (const s of shapes) {
    const atDot = resolveTap(shapes, s.cx, s.cy);
    if (atDot !== s.key) fail(`tap on ${s.key} dot resolved to ${atDot ?? "nothing"}`);
    const atLabel = resolveTap(shapes, s.rx + s.rw / 2, s.ry + s.rh / 2);
    if (atLabel !== s.key) fail(`tap on ${s.key} label resolved to ${atLabel ?? "nothing"}`);
  }

  // 2. A finger-sized ring around each dot never resolves to a DIFFERENT key
  //    (null is fine at the edges; a wrong key is the bug).
  const ringR = shapes[0].dotR * 0.9; // ~30px, a realistic fingertip offset
  for (const s of shapes) {
    for (let a = 0; a < 360; a += 30) {
      const px = s.cx + ringR * Math.cos((a * Math.PI) / 180);
      const py = s.cy + ringR * Math.sin((a * Math.PI) / 180);
      const hit = resolveTap(shapes, px, py);
      if (hit !== null && hit !== s.key) {
        fail(`tap ${ringR.toFixed(0)}px @${a}° from ${s.key} dot resolved to ${hit}`);
      }
    }
  }

  // 3. No two different callouts' hit shapes overlap.
  for (let i = 0; i < shapes.length; i++) {
    for (let j = i + 1; j < shapes.length; j++) {
      const a = shapes[i];
      const b = shapes[j];
      if (circlesOverlap(a, b)) fail(`${a.key} & ${b.key} dot circles overlap`);
      if (rectsOverlap(a, b)) fail(`${a.key} & ${b.key} label rects overlap`);
      if (rectContainsDot(a, b)) fail(`${a.key} label rect covers ${b.key} dot`);
      if (rectContainsDot(b, a)) fail(`${b.key} label rect covers ${a.key} dot`);
    }
  }

  for (const s of shapes) {
    console.log(`  ✓ ${s.key.padEnd(11)} dot(${s.cx.toFixed(0)},${s.cy.toFixed(0)}) r${s.dotR.toFixed(0)}`);
  }
}

if (failures > 0) {
  console.error(`\n✗ body-map smoke: ${failures} failure(s)`);
  process.exit(1);
}
console.log("\n✓ body-map smoke: every dot & label resolves to its own muscle; no overlaps");
