# Plan: refresh `exercises-catalog.json` from upstream

## Context

[public/data/exercises-catalog.json](../public/data/exercises-catalog.json) is a static snapshot of [yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db). It powers two things: the exercise picker at `/program/add` (UI catalog) and the muscle-group attribution used by the weekly email summary ([src/lib/muscle-groups.ts](../src/lib/muscle-groups.ts)).

Since both the picker and the email read the same file, they can't drift relative to each other. But the snapshot can drift from upstream — new exercises added upstream won't show in the picker, and any upstream rename/removal could silently break attribution for already-logged data.

We want a small `npm run refresh-catalog` script that safely updates the snapshot.

## Why "safe" matters

Existing `program_exercises` rows store `image_url` like `…/exercises/{slug}/0.jpg`. The slug is the catalog `id`. If upstream renames or removes a slug:

- The image 404s in the picker and in the rest-day animation component.
- The slug-based lookup in `getMuscleGroupsForExercise` misses for that row. It falls back to a `name` match, which usually still works — but not guaranteed.
- If upstream keeps the same slug but changes `primary[]` (the muscles), the weekly summary's muscle attribution silently shifts. No 404, no error — just different numbers.

A blind overwrite would mask all of these. The script needs to audit the diff before writing.

## Approach: refresh + audit (don't blindly overwrite)

`scripts/refresh-exercise-catalog.ts`:

1. Fetch upstream JSON: `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json` (verify path; the repo's structure may move).
2. Read the current `public/data/exercises-catalog.json`.
3. Pull every distinct slug currently referenced in `program_exercises.image_url` from the database (service-role admin client — same pattern as [scripts/seed-program.ts:36-46](../scripts/seed-program.ts)).
4. Compute a diff:
   - **Added**: in upstream, not in current — informational only.
   - **Removed**: in current, not in upstream — flag any that are referenced in `program_exercises`.
   - **Renamed slug**: heuristic — same `name` field but different `id`. Flag for backfill.
   - **Muscle attribution change**: same `id`, different `primary[]`. Flag because it silently shifts weekly summary numbers.
5. Print the diff as a human-readable report. Exit non-zero if any **referenced** slugs are removed or have changed `primary[]`, unless `--force` is passed.
6. On success (or `--force`): write the new catalog, print the path.

A second script `scripts/backfill-exercise-image-urls.ts` (only built if/when needed) re-maps stale `image_url` values for affected `program_exercises` rows by matching on the exact `name`.

## Files to add

| Path | Purpose |
|---|---|
| `scripts/refresh-exercise-catalog.ts` | Fetch + diff + audit + write |
| `scripts/backfill-exercise-image-urls.ts` | (Future, only if rename diffs show up) |

## Files to edit

- `package.json` — add `"refresh-catalog": "tsx scripts/refresh-exercise-catalog.ts"`

## Reuse

- Service-role admin client: copy the loadEnv + createClient pattern from [scripts/seed-program.ts](../scripts/seed-program.ts).
- Catalog shape (`{id, name, primary[]}`) is already documented in [src/lib/muscle-groups.ts](../src/lib/muscle-groups.ts) and [src/app/(app)/program/add/add-exercise-client.tsx:9-17](../src/app/(app)/program/add/add-exercise-client.tsx).

## Diff report shape (terminal output)

```
exercises-catalog: refresh audit
  current: 873 entries · upstream: 891 entries
  added (informational): 18
  removed: 0
  renamed slug: 0
  primary[] changed: 2
    - Barbell_Squat: ["quadriceps"] → ["quadriceps","glutes"]
    - Romanian_Deadlift: ["hamstrings"] → ["hamstrings","glutes"]
  referenced slugs in DB: 47 / 47 still resolve

NOTE: 2 exercises had their muscle attribution change. Weekly summary numbers
may shift after this refresh. Re-run with --force to apply.
```

## Risks / edge cases

- **Upstream URL path may change.** Pin a known-good commit SHA initially, expose `--ref <sha>` flag.
- **Network flakiness in CI.** This is a local-only script; not run in CI.
- **JSON encoding drift.** Preserve UTF-8 + the existing pretty-print style (or compact, whichever the current file uses) to keep diffs reviewable in git.
- **Schema drift in upstream.** If upstream adds new fields, the picker still works (it ignores unknowns). If upstream renames a field we depend on (`primary`), the script must hard-fail with a clear message.

## Verification

1. Run with no upstream changes — diff is empty, no write, exit 0.
2. Manually edit `public/data/exercises-catalog.json` to remove an entry that's referenced in DB. Run script. Expect non-zero exit and a clear error naming the slug.
3. Run with `--force` and confirm the file is overwritten.
4. After refresh, `npx tsx scripts/test-weekly-summary.ts rahul@satel.ca` → per-muscle totals still sum to total volume (no leakage from broken lookups).
