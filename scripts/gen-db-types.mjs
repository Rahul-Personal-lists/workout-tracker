// Generates src/lib/supabase/database.types.ts via the repo-pinned supabase
// CLI. Writes the file ONLY on success — the previous `supabase ... > file`
// npm script truncated the committed types whenever the CLI failed
// (2026-07-21: v1-pinned CLI + v2-stored login token).
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const OUT = "src/lib/supabase/database.types.ts";
const res = spawnSync("npx supabase gen types typescript --linked", {
  shell: true,
  encoding: "utf-8",
  maxBuffer: 16 * 1024 * 1024,
});

if (res.status !== 0 || !res.stdout?.includes("export type Database")) {
  console.error((res.stderr || "").trim() || `exit ${res.status}`);
  console.error("db:types: generation FAILED — types file left untouched.");
  process.exit(res.status || 1);
}

writeFileSync(OUT, res.stdout);
console.log(`db:types: wrote ${OUT} (${res.stdout.split("\n").length} lines).`);
