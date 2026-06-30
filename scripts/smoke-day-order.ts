// Smoke test for planDayOrder (src/lib/day-order.ts): contiguity, label sync,
// custom-label preservation, explicit insert/reorder order, archived parking,
// and the already-normalized no-op.
// Run: npx tsx scripts/smoke-day-order.ts
import { planDayOrder, type DayRow, type DayOrderTarget } from "@/lib/day-order";

let failures = 0;

function expectTargets(
  label: string,
  got: DayOrderTarget[],
  want: Record<string, { day_number: number; label: string }>,
) {
  const gotById = new Map(got.map((t) => [t.id, t]));
  const wantIds = Object.keys(want);
  let ok = got.length === wantIds.length;
  for (const id of wantIds) {
    const g = gotById.get(id);
    if (!g || g.day_number !== want[id].day_number || g.label !== want[id].label) {
      ok = false;
    }
  }
  if (ok) {
    console.log(`  ✓ ${label}`);
  } else {
    failures++;
    console.error(`  ✗ ${label}`);
    console.error(`      got:  ${JSON.stringify(got)}`);
    console.error(`      want: ${JSON.stringify(want)}`);
  }
}

// 1. Drift state with an archived day wedged mid-sequence -> contiguous 1..N,
//    labels synced to new positions, archived parked at N+1, order preserved.
{
  const rows: DayRow[] = [
    { id: "a", day_number: 1, label: "Day 5", archived_at: null },
    { id: "b", day_number: 2, label: "Day 2", archived_at: null },
    { id: "c", day_number: 3, label: "Day 1", archived_at: null },
    { id: "d", day_number: 4, label: "Day 3", archived_at: null },
    { id: "x", day_number: 5, label: "Day 5", archived_at: "2026-01-01T00:00:00Z" },
    { id: "e", day_number: 6, label: "Day 4", archived_at: null },
    { id: "f", day_number: 7, label: "Day 6", archived_at: null },
    { id: "g", day_number: 8, label: "Day 7", archived_at: null },
  ];
  expectTargets("drift + archived mid-sequence", planDayOrder(rows), {
    a: { day_number: 1, label: "Day 1" },
    b: { day_number: 2, label: "Day 2" },
    c: { day_number: 3, label: "Day 3" },
    d: { day_number: 4, label: "Day 4" },
    e: { day_number: 5, label: "Day 5" },
    f: { day_number: 6, label: "Day 6" },
    g: { day_number: 7, label: "Day 7" },
    x: { day_number: 8, label: "Day 5" },
  });
}

// 2. Custom labels are preserved.
{
  const rows: DayRow[] = [
    { id: "a", day_number: 1, label: "Squat day", archived_at: null },
    { id: "b", day_number: 2, label: "Day 2", archived_at: null },
  ];
  expectTargets("custom label preserved", planDayOrder(rows), {
    a: { day_number: 1, label: "Squat day" },
    b: { day_number: 2, label: "Day 2" },
  });
}

// 3. Explicit insert-at-position (addDay): new day "n" spliced at live pos 2.
{
  const rows: DayRow[] = [
    { id: "a", day_number: 1, label: "Day 1", archived_at: null },
    { id: "b", day_number: 2, label: "Day 2", archived_at: null },
    { id: "c", day_number: 3, label: "Day 3", archived_at: null },
    { id: "n", day_number: 1004, label: "Day 2", archived_at: null },
  ];
  expectTargets("insert at position 2", planDayOrder(rows, ["a", "n", "b", "c"]), {
    a: { day_number: 1, label: "Day 1" },
    n: { day_number: 2, label: "Day 2" },
    b: { day_number: 3, label: "Day 3" },
    c: { day_number: 4, label: "Day 4" },
  });
}

// 4. Reorder swap (move c earlier past b).
{
  const rows: DayRow[] = [
    { id: "a", day_number: 1, label: "Day 1", archived_at: null },
    { id: "b", day_number: 2, label: "Day 2", archived_at: null },
    { id: "c", day_number: 3, label: "Day 3", archived_at: null },
  ];
  expectTargets("reorder swap", planDayOrder(rows, ["a", "c", "b"]), {
    a: { day_number: 1, label: "Day 1" },
    c: { day_number: 2, label: "Day 2" },
    b: { day_number: 3, label: "Day 3" },
  });
}

// 5. Already normalized -> targets equal input (drives the writer's no-op).
{
  const rows: DayRow[] = [
    { id: "a", day_number: 1, label: "Day 1", archived_at: null },
    { id: "b", day_number: 2, label: "Day 2", archived_at: null },
  ];
  expectTargets("already normalized", planDayOrder(rows), {
    a: { day_number: 1, label: "Day 1" },
    b: { day_number: 2, label: "Day 2" },
  });
}

// 6. Stale caller order: omitted live id is appended, never dropped.
{
  const rows: DayRow[] = [
    { id: "a", day_number: 1, label: "Day 1", archived_at: null },
    { id: "b", day_number: 2, label: "Day 2", archived_at: null },
    { id: "c", day_number: 3, label: "Day 3", archived_at: null },
  ];
  expectTargets("stale caller order appends missing", planDayOrder(rows, ["c", "a"]), {
    c: { day_number: 1, label: "Day 1" },
    a: { day_number: 2, label: "Day 2" },
    b: { day_number: 3, label: "Day 3" },
  });
}

if (failures > 0) {
  console.error(`\n✗ day-order smoke: ${failures} failure(s)`);
  process.exit(1);
}
console.log(
  "\n✓ day-order smoke: contiguity, label sync, custom-label preservation, insert/reorder order, archived parking, and no-op all correct",
);
