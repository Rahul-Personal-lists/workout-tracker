Automated weekly refresh of `public/data/exercises-catalog.json` from [yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db).

```

> workout-tracker@0.1.0 refresh-catalog
> npx tsx scripts/refresh-exercise-catalog.ts --ref main --no-db --force

exercises-catalog refresh
  current:  873 entries
  upstream: 873 entries (ref: main @ b0eed06)

  added (informational):     0
  removed:                   0
  renamed slug:              0
  primary[] changed:         0

  DB-referenced slugs:  (skipped, --no-db)

No changes — leaving file untouched.
```

If the report flags **primary[] changed** or **removed**, re-run `npm run refresh-catalog` locally (with Supabase env vars) to see the full DB-reference audit before merging.
