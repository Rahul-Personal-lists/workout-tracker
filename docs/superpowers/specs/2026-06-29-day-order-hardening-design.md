# Day-order hardening — keep `program_days` labels & numbering consistent

**Date:** 2026-06-29
**Branch:** `fix/day-order-hardening`
**Status:** approved design, pre-implementation

## Problem

A live-data incident (rahul@satel.ca, active "12-Week Hypertrophy") showed the program hub
rendering days in the wrong order — Barbell Bench Press in the 3rd slot, the Wednesday rest
misplaced, the Lower-Hypertrophy day drifted to the front. The day data itself was intact; only the
stored *order* was wrong. Root cause was a structural fragility in how `program_days` order is
represented, made of two asymmetries:

1. **Labels drift from position.** A day's slot is its `day_number`; its display text is the
   separate `label` column (e.g. `"Day 3"`). `reorderDay` → the `swap_day_order` RPC swaps two days'
   `day_number` but **never touches `label`**, while `addDay` **does** renumber `"Day N"` labels on
   insert. So after using the ◀ ▶ move buttons, a day labeled `"Day 1"` can sit in slot 3. The hub
   pills number by *position* and ignore the label, but `getSessionHistory`, `getSessionContext`,
   the in-progress card, and `getUndoableSkip` all read the stored `label` — so they disagree, and
   the state becomes very hard to reason about.

2. **Archived days wedge into the numbering.** Three code paths treat archived days differently:
   `addDay`'s shift query (`.gte("day_number", targetPosition)`) counts them, `reorderDay`'s sibling
   list filters them out (`.is("archived_at", null)`), and `getCurrentProgram` filters them out on
   read. An archived day sitting mid-sequence (the incident had an empty archived "New day" at
   `day_number` 5) leaves live `day_number`s non-contiguous (`[1,2,3,4,6,7,8]`) and makes `addDay`'s
   `position` argument — intended as a *live* position — misalign with raw `day_number`.

The incident's data is already corrected (a one-time `day_number` renumber). This work prevents
recurrence and makes the representation self-consistent.

## Scope decisions (locked)

- **In scope:** (1) auto `"Day N"` labels always stay synced to position; (2) live `day_number`s
  stay contiguous `1..N` and archived days never wedge into the live range.
- **Approach: B — one pure planner + one writer**, called by the day-mutating actions. Chosen over
  a minimal two-patch fix (keeps the fragile model) and over deriving labels on read (touches every
  read path + history semantics; over-scoped).
- **No "reset order" UI.** Once labels always equal position there is nothing canonical to reset
  *to* (sorting by label would equal the current order); a wrong order can only come from a
  deliberate reorder the user can deliberately undo. (YAGNI.)
- **History labels read live** (no snapshot column, no migration). A past session's `"Day N"`
  reflects the day's *current* slot; its title (e.g. "Upper — Strength"), week number, and date are
  unchanged. This is more consistent than freezing a stale "Day 1" on a day that is now 3rd.
- **No migration.** The change is pure TypeScript. `swap_day_order` stays in the DB **unused**
  (optional future cleanup migration to drop it; explicitly not done here).
- **Source of truth = current `day_number` order.** The planner makes state *consistent* (labels ↔
  position, contiguity, archived parking) while **preserving the order the rows are currently in**.
  It does not infer "original intent" — going forward, `day_number` order always equals what the
  user arranged via the UI.

## Component 1 — `planDayOrder` (pure, testable) — new `src/lib/day-order.ts`

No DB, no `server-only` import (so the smoke script and tests can import it directly, matching
`src/lib/reframe.ts` / `src/lib/media-snapshot.ts`).

```ts
export type DayRow = {
  id: string;
  day_number: number;
  label: string;
  archived_at: string | null;
};

export type DayOrderTarget = { id: string; day_number: number; label: string };

const AUTO_LABEL = /^Day \d+$/;

// Target ordering for ALL rows. Live days are renumbered 1..N in the resolved
// order with auto-labels synced to position; archived days are parked at
// N+1..N+M by current day_number (labels untouched). `explicitLiveOrder` gives
// the desired live order (insert/reorder); when omitted, live order = current
// day_number ascending. Live ids missing from explicitLiveOrder are appended
// (by current day_number) so a stale caller order can never drop a row.
export function planDayOrder(
  days: DayRow[],
  explicitLiveOrder?: string[],
): DayOrderTarget[];
```

Logic:
1. Split `live` (`archived_at === null`) and `archived`.
2. Resolve live order: if `explicitLiveOrder` given, take its ids that exist in `live` (deduped),
   then append any remaining live ids in current-`day_number` order; else live order =
   current-`day_number` order.
3. Live day at index `i` → `day_number = i + 1`; `label = AUTO_LABEL.test(current) ? "Day " + (i+1)
   : current` (custom labels like `"Squat day"` preserved).
4. Archived (sorted by current `day_number`) at index `j` → `day_number = liveCount + 1 + j`,
   `label` unchanged.
5. Return targets for every row.

## Component 2 — `applyDayOrder` (writer) — in `src/app/actions/program.ts`

```ts
async function applyDayOrder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  programId: string,
  explicitLiveOrder?: string[],
): Promise<void>;
```

1. Fetch all `program_days` for `programId` (`id, day_number, label, archived_at`) — RLS scopes to
   the owner.
2. `targets = planDayOrder(rows, explicitLiveOrder)`.
3. **Early-exit:** if every target's `day_number` and `label` already equal current, return (so the
   call is a no-op when state is clean).
4. **Two-phase write** to dodge the `unique (program_id, day_number)` constraint — mirrors the
   existing `renumberExercises`:
   - `OFFSET = 1_000_000` (day count ≤ 20, so `OFFSET + target` never collides with any current
     value and the offset values are mutually distinct).
   - Phase 1: for each target, `update { day_number: OFFSET + target.day_number }`.
   - Phase 2: for each target, `update { day_number: target.day_number, label: target.label }`.
5. No `revalidatePath` here — callers own that.

`normalizeProgramDays(programId)` is simply `applyDayOrder(supabase, programId)` (no explicit
order); available for future self-heal call sites but not separately needed today, since the two
callers below already pass an explicit order and `applyDayOrder` parks archived + restores
contiguity as a side effect regardless.

## Component 3 — refactor the two call sites (`src/app/actions/program.ts`)

**`reorderDay`** — drop the `swap_day_order` RPC entirely:
- Resolve the target's `program_id`, fetch live siblings ordered by `day_number` → `ids`.
- `idx = ids.indexOf(dayId)`; `neighborIdx = direction === "up" ? idx-1 : idx+1`; return early if
  `idx === -1` or `neighborIdx` out of bounds.
- Swap `ids[idx]` and `ids[neighborIdx]` in the array; `await applyDayOrder(supabase, programId,
  ids)`; `revalidatePath("/program")`.

**`addDay`** — replace the manual descending-shift + conditional-relabel block:
- Fetch live ids ordered by `day_number` → `liveIds` (length `N`).
- `P = position !== undefined ? clamp(position, 1, N+1) : N+1` — now interpreted as a **live**
  position (fixes the archived-gap misalignment).
- Insert the new row at a temporary `day_number = max(all day_number for program) + 1000` (avoids
  the unique collision before normalization), with the given `label`/`title`; capture `inserted.id`.
- `desired = [...liveIds.slice(0, P-1), inserted.id, ...liveIds.slice(P-1)]`;
  `await applyDayOrder(supabase, programId, desired)`. The inserted `label` (`"Day N"` from the
  caller) matches `AUTO_LABEL`, so it is synced to its final position `P`; the `title`
  (`"Rest"`/`"New day"`) is preserved.
- `revalidatePath("/program")`; `return { dayId: inserted.id }`.

`AddDaySchema` is unchanged (`position` stays `int min 1 max 20 optional`); only its interpretation
changes from raw `day_number` to live position, which is what `DayTabs` already passes.

## What does NOT change

- `getCurrentProgram` / `DayTabs` positional pill numbering — already correct; just becomes
  consistent with contiguous `day_number`s.
- `renumberExercises` and exercise ordering — untouched (different concern).
- `swap_day_order.sql` migration — left in place, now unused (one-line deprecation comment optional).
- DB schema — no migration.
- Progression math, `planned_*` snapshotting, session/history FK chains — untouched (history keys
  off stable day IDs + title + week, not `day_number`).

## Edge cases

- **Custom labels** (not `^Day \d+$`) preserved verbatim.
- **Single-day / all-rest programs** — trivially handled (`N = 1`, or all live).
- **Already-normalized** — early-exit, no writes, no revalidate churn.
- **Stale caller order** (live id missing from `explicitLiveOrder`) — appended by current
  `day_number`, never dropped (same resilience as `setExerciseOrder`).
- **Legacy drift in another program** — on the next add/reorder there, `applyDayOrder` makes it
  consistent (contiguous + labels synced), preserving its current `day_number` order. It does not
  reconstruct original intent; the user can reorder if needed.
- **`unique (program_id, day_number)`** — handled by the two-phase offset.

## Verification

- New `scripts/smoke-day-order.ts` (matches `scripts/smoke-reframe.ts` style) asserting
  `planDayOrder` against:
  1. non-contiguous live + an archived day mid-sequence → contiguous `1..N`, archived parked at
     `N+1`, order preserved by input `day_number`;
  2. auto labels synced to new positions;
  3. a custom label preserved;
  4. an explicit insert-at-position order;
  5. a reorder swap;
  6. an already-normalized input → targets equal input (drives the writer's no-op early-exit).
- `npm run typecheck` (`tsc --noEmit`) clean — if a stale empty `.next/dev/types/routes.d.ts`
  produces a false "not a module" error, clear `.next/dev/types`.
- `npm run lint` — 0 new errors (2 pre-existing `progression.ts` warnings expected).
- Production build green.
- Manual (preview, `claude-test@example.com`): on a seeded program, use ◀ ▶ to move a day and
  confirm the moved day's `"Day N"` label and pill position stay in agreement and live numbering
  stays contiguous; insert a rest day mid-week and confirm labels renumber correctly; confirm
  history still renders. (Do not exercise on rahul@satel.ca.)

## Out of scope (noted, not touched)

- Dropping the unused `swap_day_order` function (would need a migration; deferred).
- Snapshotting day labels into `workout_sessions` for frozen history labels (rejected above).
- Any "reset order" UI (rejected above).
- A general self-heal pass over all existing programs (single-user app; the active program is
  already fixed, and other programs self-heal on next mutation).
