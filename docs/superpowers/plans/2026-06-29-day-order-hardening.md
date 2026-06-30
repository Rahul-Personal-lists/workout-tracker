# Day-order hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep `program_days` auto `"Day N"` labels synced to position and live `day_number`s contiguous so the reorder/insert drift that scrambled a live program can't recur.

**Architecture:** A pure planner `planDayOrder` (new `src/lib/day-order.ts`, no DB) computes target `day_number` + `label` for every day; a server-side writer `applyDayOrder` (in `src/app/actions/program.ts`) fetches → plans → two-phase writes (no-op if already clean). `reorderDay` and `addDay` are refactored to call the writer. No schema migration.

**Tech Stack:** Next.js 16 App Router, TypeScript (strict), Supabase (RLS, user-scoped client), Zod; pure-unit smoke scripts run via `npx tsx`.

## Global Constraints

- **No DB migration.** The `swap_day_order` SQL function stays in the DB **unused** — do **not** delete it.
- **`src/lib/day-order.ts` must stay pure** — no `import "server-only"`, no Supabase/DB import — so `scripts/smoke-day-order.ts` can import it under `npx tsx`.
- **Only auto labels sync.** Sync labels matching `^Day \d+$` only; preserve any custom label (e.g. `"Squat day"`) verbatim.
- **Two-phase writes** for every `day_number` rewrite (the `unique (program_id, day_number)` index) — `OFFSET = 1_000_000`, mirroring `renumberExercises`.
- **History labels read live** — no snapshot column, no change to `set_logs`/`planned_*`/progression math.
- **Mutations go through the user-scoped client** from `requireUser()` (RLS owner-scoped); no service role.
- **Every commit message** ends with the repo's standard `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>` + `Claude-Session:` trailers.
- Branch is `fix/day-order-hardening` (already created; the spec is committed there).

---

### Task 1: Pure `planDayOrder` helper + smoke test

**Files:**
- Create: `src/lib/day-order.ts`
- Test: `scripts/smoke-day-order.ts`

**Interfaces:**
- Consumes: nothing (pure, standalone).
- Produces:
  - `type DayRow = { id: string; day_number: number; label: string; archived_at: string | null }`
  - `type DayOrderTarget = { id: string; day_number: number; label: string }`
  - `function planDayOrder(days: DayRow[], explicitLiveOrder?: string[]): DayOrderTarget[]` — returns a target for **every** row: live days contiguous `1..N` in the resolved order with auto labels synced; archived days parked at `N+1..N+M` (labels untouched).

- [ ] **Step 1: Write the failing smoke test**

Create `scripts/smoke-day-order.ts`:

```ts
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
```

- [ ] **Step 2: Run the smoke test to verify it fails**

Run: `npx tsx scripts/smoke-day-order.ts`
Expected: FAIL — cannot resolve `@/lib/day-order` (module does not exist yet).

- [ ] **Step 3: Implement `planDayOrder`**

Create `src/lib/day-order.ts`:

```ts
// Pure planner for program_days ordering. Given a program's day rows, returns
// the target day_number + label for EVERY row so that: live days are contiguous
// 1..N in the resolved order with auto "Day N" labels synced to position (custom
// labels preserved), and archived days are parked at N+1..N+M (labels untouched).
// No DB / no "server-only" import so it can be smoke-tested directly under tsx.

export type DayRow = {
  id: string;
  day_number: number;
  label: string;
  archived_at: string | null;
};

export type DayOrderTarget = { id: string; day_number: number; label: string };

// Matches ONLY the auto-generated "Day N" labels, so custom labels like
// "Squat day" are never rewritten.
const AUTO_LABEL = /^Day \d+$/;

export function planDayOrder(
  days: DayRow[],
  explicitLiveOrder?: string[],
): DayOrderTarget[] {
  const live = days.filter((d) => d.archived_at === null);
  const archived = days.filter((d) => d.archived_at !== null);

  const byNumber = (a: DayRow, b: DayRow) => a.day_number - b.day_number;
  const liveByNumber = live.slice().sort(byNumber);

  // Resolve the live order. With an explicit order, keep only ids that are
  // actually live (deduped), then append any live ids the caller omitted (in
  // day_number order) so a stale caller list can never drop a row.
  let orderedLive: DayRow[];
  if (explicitLiveOrder) {
    const liveById = new Map(live.map((d) => [d.id, d]));
    const seen = new Set<string>();
    const picked: DayRow[] = [];
    for (const id of explicitLiveOrder) {
      const row = liveById.get(id);
      if (row && !seen.has(id)) {
        seen.add(id);
        picked.push(row);
      }
    }
    for (const row of liveByNumber) {
      if (!seen.has(row.id)) picked.push(row);
    }
    orderedLive = picked;
  } else {
    orderedLive = liveByNumber;
  }

  const targets: DayOrderTarget[] = [];
  orderedLive.forEach((d, i) => {
    const pos = i + 1;
    targets.push({
      id: d.id,
      day_number: pos,
      label: AUTO_LABEL.test(d.label) ? `Day ${pos}` : d.label,
    });
  });

  archived
    .slice()
    .sort(byNumber)
    .forEach((d, j) => {
      targets.push({
        id: d.id,
        day_number: orderedLive.length + 1 + j,
        label: d.label,
      });
    });

  return targets;
}
```

- [ ] **Step 4: Run the smoke test to verify it passes**

Run: `npx tsx scripts/smoke-day-order.ts`
Expected: PASS — all six checks `✓`, final success line printed.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: clean (no errors). If a stale empty `.next/dev/types/routes.d.ts` reports "not a module", `rm -rf .next/dev/types` and re-run.

- [ ] **Step 6: Commit**

```bash
git add src/lib/day-order.ts scripts/smoke-day-order.ts
git commit -m "feat: pure planDayOrder helper + smoke test"
# (append the standard Co-Authored-By + Claude-Session trailers)
```

---

### Task 2: `applyDayOrder` writer + refactor `reorderDay`

**Files:**
- Modify: `src/app/actions/program.ts` — add import; add `applyDayOrder` helper (near `renumberExercises`, ~line 154); replace `reorderDay` (currently lines ~606-637).

**Interfaces:**
- Consumes: `planDayOrder`, `DayRow` from `@/lib/day-order` (Task 1).
- Produces: `async function applyDayOrder(supabase, programId: string, explicitLiveOrder?: string[]): Promise<void>` — used by `addDay` in Task 3.

> No server-action test runner exists in this repo; the behavioral core is covered by Task 1's `planDayOrder` smoke test. This task's gate is typecheck + lint + build green (and the smoke test still passing), plus the manual preview in Task 4.

- [ ] **Step 1: Add the import**

At the top of `src/app/actions/program.ts`, below the existing `mediaSnapshotError` import (line ~8), add:

```ts
import { planDayOrder, type DayRow } from "@/lib/day-order";
```

- [ ] **Step 2: Add the `applyDayOrder` helper**

Insert this function in `src/app/actions/program.ts` immediately after `renumberExercises` (after its closing brace, ~line 173):

```ts
// Two-phase day_number rewrite (mirrors renumberExercises): push every row into
// a temp high range so the final 1..N assignments can't collide with the
// `unique (program_id, day_number)` index. planDayOrder also syncs auto "Day N"
// labels to position and parks archived days above the live range. Pass
// `explicitLiveOrder` to impose a new live order (insert/reorder); omit to
// normalize the current order in place. No-ops when already normalized.
async function applyDayOrder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  programId: string,
  explicitLiveOrder?: string[]
) {
  const { data: rows, error } = await supabase
    .from("program_days")
    .select("id, day_number, label, archived_at")
    .eq("program_id", programId);
  if (error) throw error;

  const current = (rows ?? []) as DayRow[];
  const targets = planDayOrder(current, explicitLiveOrder);

  const currentById = new Map(
    current.map((r) => [r.id, { day_number: r.day_number, label: r.label }])
  );
  const changed = targets.some((t) => {
    const c = currentById.get(t.id);
    return !c || c.day_number !== t.day_number || c.label !== t.label;
  });
  if (!changed) return;

  const OFFSET = 1_000_000;
  for (const t of targets) {
    const { error: e1 } = await supabase
      .from("program_days")
      .update({ day_number: OFFSET + t.day_number })
      .eq("id", t.id);
    if (e1) throw e1;
  }
  for (const t of targets) {
    const { error: e2 } = await supabase
      .from("program_days")
      .update({ day_number: t.day_number, label: t.label })
      .eq("id", t.id);
    if (e2) throw e2;
  }
}
```

- [ ] **Step 3: Replace `reorderDay`**

Replace the entire existing `reorderDay` function (currently ~lines 606-637, the version that calls `supabase.rpc("swap_day_order", …)`) with:

```ts
export async function reorderDay(input: z.infer<typeof ReorderDaySchema>) {
  const { dayId, direction } = ReorderDaySchema.parse(input);
  const { supabase } = await requireUser();

  const { data: target, error: tErr } = await supabase
    .from("program_days")
    .select("id, program_id")
    .eq("id", dayId)
    .single();
  if (tErr || !target) throw tErr ?? new Error("Day not found");

  const { data: siblings, error: sErr } = await supabase
    .from("program_days")
    .select("id, day_number")
    .eq("program_id", target.program_id)
    .is("archived_at", null)
    .order("day_number", { ascending: true });
  if (sErr) throw sErr;

  const ids = (siblings ?? []).map((d) => d.id);
  const idx = ids.indexOf(dayId);
  const neighborIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || neighborIdx < 0 || neighborIdx >= ids.length) return;

  // Swap the target with its visible neighbor, then renumber + relabel in one
  // place. Replaces the old swap_day_order RPC (which moved day_number but left
  // labels stale).
  [ids[idx], ids[neighborIdx]] = [ids[neighborIdx], ids[idx]];
  await applyDayOrder(supabase, target.program_id, ids);

  revalidatePath("/program");
}
```

The `ReorderDaySchema` (lines ~601-604) is unchanged.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: clean. (`swap_day_order` is no longer referenced in TS; that's fine — the SQL function remains in the DB, unused.)

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: 0 new errors (2 pre-existing `progression.ts` warnings are expected).

- [ ] **Step 6: Commit**

```bash
git add src/app/actions/program.ts
git commit -m "refactor: applyDayOrder writer + reorderDay via array-swap (retire swap_day_order use)"
# (append the standard Co-Authored-By + Claude-Session trailers)
```

---

### Task 3: Refactor `addDay` to insert-then-normalize

**Files:**
- Modify: `src/app/actions/program.ts` — replace `addDay` body (currently lines ~536-599).

**Interfaces:**
- Consumes: `applyDayOrder` (Task 2).
- Produces: `addDay` unchanged signature — returns `{ dayId: string }`.

- [ ] **Step 1: Replace `addDay`**

Replace the entire existing `addDay` function (currently ~lines 536-599, the version with the descending shift loop) with:

```ts
export async function addDay(input: z.infer<typeof AddDaySchema>) {
  const parsed = AddDaySchema.parse(input);
  const { supabase } = await requireUser();

  // Live days in current order. `position` is a LIVE position (1..N+1), not a
  // raw day_number — so an archived day in the middle can't throw off the slot.
  const { data: live, error: liveErr } = await supabase
    .from("program_days")
    .select("id, day_number")
    .eq("program_id", parsed.programId)
    .is("archived_at", null)
    .order("day_number", { ascending: true });
  if (liveErr) throw liveErr;
  const liveIds = (live ?? []).map((d) => d.id);
  const n = liveIds.length;
  const targetPosition =
    parsed.position !== undefined
      ? Math.min(Math.max(parsed.position, 1), n + 1)
      : n + 1;

  // Park the new row at a temp day_number above everything (incl. archived) so
  // it can't trip the unique index before applyDayOrder renumbers it.
  const { data: maxRow, error: maxErr } = await supabase
    .from("program_days")
    .select("day_number")
    .eq("program_id", parsed.programId)
    .order("day_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maxErr) throw maxErr;
  const tempNumber = (maxRow?.day_number ?? 0) + 1000;

  const { data: inserted, error } = await supabase
    .from("program_days")
    .insert({
      program_id: parsed.programId,
      day_number: tempNumber,
      label: parsed.label,
      title: parsed.title,
    })
    .select("id")
    .single();
  if (error) throw error;

  // Splice the new day into the live order at the requested position, then let
  // applyDayOrder make it contiguous 1..N and sync its "Day N" label.
  const desired = [
    ...liveIds.slice(0, targetPosition - 1),
    inserted.id,
    ...liveIds.slice(targetPosition - 1),
  ];
  await applyDayOrder(supabase, parsed.programId, desired);

  revalidatePath("/program");
  return { dayId: inserted.id };
}
```

The `AddDaySchema` (lines ~527-534) is unchanged.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: 0 new errors (2 pre-existing `progression.ts` warnings expected).

- [ ] **Step 4: Commit**

```bash
git add src/app/actions/program.ts
git commit -m "refactor: addDay inserts then normalizes via applyDayOrder"
# (append the standard Co-Authored-By + Claude-Session trailers)
```

---

### Task 4: Full verification

**Files:** none (verification only; no commit).

- [ ] **Step 1: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: 0 new errors (2 pre-existing `progression.ts` warnings expected).

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: production build succeeds.

- [ ] **Step 4: Smoke test**

Run: `npx tsx scripts/smoke-day-order.ts`
Expected: PASS — all six checks `✓`.

- [ ] **Step 5: Manual preview (recommended; use `claude-test@example.com`, NOT rahul@satel.ca)**

Authenticate the preview per CLAUDE.md (`npx tsx scripts/test-otp.ts` → set cookies → load `/program`). Then:
1. Use the ◀ ▶ "move day" buttons to move a training day earlier; confirm the moved day's pill position and its label (visible in history / the in-progress card) stay in agreement, and the day pills stay a contiguous Day 1..N.
2. Use the **+** add-day menu to insert a Rest day mid-week ("After Day 2"); confirm it lands in slot 3 and the following days renumber to Day 4, Day 5, … with no gap.
3. Open a past session in History and confirm it still renders (label + title present).

---

## Notes for the implementer

- Do **not** add a migration and do **not** delete `supabase/migrations/20260430000000_swap_day_order.sql` — the function is intentionally left in place, unused.
- `src/lib/day-order.ts` must not import anything from Supabase or use `"server-only"` — keep it pure so the smoke script runs under `npx tsx`.
- Read `node_modules/next/dist/docs/` before touching any Next.js API (per `AGENTS.md`) — though this plan touches only server-action internals and a pure lib, no new Next APIs.
