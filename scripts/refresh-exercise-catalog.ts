/**
 * Refresh public/data/exercises-catalog.json from yuhonas/free-exercise-db.
 *
 *   npx tsx scripts/refresh-exercise-catalog.ts [--ref <ref>] [--force] [--no-db] [--dry-run]
 *
 * Audits the diff before overwriting:
 *   - Removed slugs still referenced in program_exercises.image_url -> blocks unless --force.
 *   - Same id but different primary[] (silently shifts weekly-summary numbers) -> blocks unless --force.
 *
 * --no-db skips the DB-reference audit (used in CI; SUPABASE_SERVICE_ROLE_KEY not needed then).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const CATALOG_PATH = resolve(process.cwd(), "public/data/exercises-catalog.json");
const UPSTREAM_REPO = "yuhonas/free-exercise-db";

type CatalogEntry = {
  id: string;
  name: string;
  equipment: string | null;
  category: string;
  force: string | null;
  level: string | null;
  primary: string[];
};

type UpstreamEntry = {
  id: string;
  name: string;
  equipment?: string | null;
  category?: string;
  force?: string | null;
  level?: string | null;
  primaryMuscles?: string[];
};

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  try {
    const raw = readFileSync(envPath, "utf-8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // No .env.local — fall back to process env.
  }
}

type Args = { ref: string; force: boolean; noDb: boolean; dryRun: boolean };

function parseArgs(argv: string[]): Args {
  const out: Args = { ref: "main", force: false, noDb: false, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--ref") out.ref = argv[++i] ?? "main";
    else if (a === "--force") out.force = true;
    else if (a === "--no-db") out.noDb = true;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--help" || a === "-h") {
      console.log(
        "Usage: npx tsx scripts/refresh-exercise-catalog.ts [--ref <ref>] [--force] [--no-db] [--dry-run]"
      );
      process.exit(0);
    } else {
      console.error(`Unknown arg: ${a}`);
      process.exit(2);
    }
  }
  return out;
}

async function fetchUpstream(ref: string): Promise<{ entries: UpstreamEntry[]; resolvedSha: string | null }> {
  const url = `https://raw.githubusercontent.com/${UPSTREAM_REPO}/${ref}/dist/exercises.json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Upstream fetch failed: HTTP ${res.status} ${res.statusText} (${url})`);
  }
  const json = (await res.json()) as unknown;
  if (!Array.isArray(json)) throw new Error("Upstream payload is not an array");
  // Resolve the ref to a SHA for the report (best-effort; non-fatal).
  let resolvedSha: string | null = null;
  try {
    const refRes = await fetch(`https://api.github.com/repos/${UPSTREAM_REPO}/commits/${ref}`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (refRes.ok) {
      const body = (await refRes.json()) as { sha?: string };
      resolvedSha = body.sha ?? null;
    }
  } catch {
    // Non-fatal.
  }
  return { entries: json as UpstreamEntry[], resolvedSha };
}

function normalize(upstream: UpstreamEntry[]): CatalogEntry[] {
  const out: CatalogEntry[] = upstream.map((e) => {
    if (!e.id || !e.name) throw new Error(`Upstream entry missing id/name: ${JSON.stringify(e)}`);
    if (!Array.isArray(e.primaryMuscles)) {
      throw new Error(`Upstream entry ${e.id} missing primaryMuscles[] — upstream schema may have changed`);
    }
    return {
      id: e.id,
      name: e.name,
      equipment: e.equipment ?? null,
      category: e.category ?? "",
      force: e.force ?? null,
      level: e.level ?? null,
      primary: e.primaryMuscles,
    };
  });
  out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return out;
}

function readCurrent(): CatalogEntry[] {
  const raw = readFileSync(CATALOG_PATH, "utf-8");
  return JSON.parse(raw) as CatalogEntry[];
}

type DbAuditResult = { referenced: Set<string>; total: number; resolved: number };

async function auditDb(upstreamIds: Set<string>): Promise<DbAuditResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Use --no-db to skip the DB audit."
    );
  }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const referenced = new Set<string>();
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await admin
      .from("program_exercises")
      .select("image_url")
      .not("image_url", "is", null)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data) {
      const m = row.image_url?.match(/\/exercises\/([^/]+)\//);
      if (m) referenced.add(m[1]);
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }
  let resolved = 0;
  for (const slug of referenced) if (upstreamIds.has(slug)) resolved += 1;
  return { referenced, total: referenced.size, resolved };
}

type Diff = {
  added: string[];
  removed: string[];
  renamed: { from: string; to: string; name: string }[];
  primaryChanged: { id: string; before: string[]; after: string[] }[];
};

function diff(current: CatalogEntry[], upstream: CatalogEntry[]): Diff {
  const byIdCurrent = new Map(current.map((e) => [e.id, e]));
  const byIdUpstream = new Map(upstream.map((e) => [e.id, e]));
  const byNameUpstream = new Map(upstream.map((e) => [e.name.toLowerCase(), e]));

  const added: string[] = [];
  const removed: string[] = [];
  const renamed: Diff["renamed"] = [];
  const primaryChanged: Diff["primaryChanged"] = [];

  for (const u of upstream) if (!byIdCurrent.has(u.id)) added.push(u.id);

  for (const c of current) {
    const u = byIdUpstream.get(c.id);
    if (!u) {
      // Removed by id — but maybe renamed (same name, different id upstream)?
      const renameMatch = byNameUpstream.get(c.name.toLowerCase());
      if (renameMatch && renameMatch.id !== c.id) {
        renamed.push({ from: c.id, to: renameMatch.id, name: c.name });
      } else {
        removed.push(c.id);
      }
    } else {
      const before = c.primary ?? [];
      const after = u.primary ?? [];
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        primaryChanged.push({ id: c.id, before, after });
      }
    }
  }
  return { added, removed, renamed, primaryChanged };
}

function pad(n: number, width = 4) {
  return String(n).padStart(width);
}

function report(
  current: CatalogEntry[],
  upstream: CatalogEntry[],
  d: Diff,
  ref: string,
  resolvedSha: string | null,
  db: DbAuditResult | null,
  referencedRemoved: string[]
): string {
  const shortSha = resolvedSha ? resolvedSha.slice(0, 7) : "?";
  const lines: string[] = [];
  lines.push("exercises-catalog refresh");
  lines.push(`  current:  ${current.length} entries`);
  lines.push(`  upstream: ${upstream.length} entries (ref: ${ref} @ ${shortSha})`);
  lines.push("");
  lines.push(`  added (informational):  ${pad(d.added.length)}`);
  lines.push(`  removed:                ${pad(d.removed.length)}`);
  lines.push(`  renamed slug:           ${pad(d.renamed.length)}`);
  lines.push(`  primary[] changed:      ${pad(d.primaryChanged.length)}`);
  if (d.added.length > 0) {
    lines.push("");
    lines.push("  added:");
    for (const id of d.added.slice(0, 50)) lines.push(`    + ${id}`);
    if (d.added.length > 50) lines.push(`    ... and ${d.added.length - 50} more`);
  }
  if (d.removed.length > 0) {
    lines.push("");
    lines.push("  removed:");
    for (const id of d.removed) lines.push(`    - ${id}`);
  }
  if (d.renamed.length > 0) {
    lines.push("");
    lines.push("  renamed slug (same name, different id):");
    for (const r of d.renamed) lines.push(`    ${r.from} -> ${r.to}   (${r.name})`);
  }
  if (d.primaryChanged.length > 0) {
    lines.push("");
    lines.push("  primary[] changed:");
    for (const p of d.primaryChanged) {
      lines.push(`    ${p.id}: ${JSON.stringify(p.before)} -> ${JSON.stringify(p.after)}`);
    }
  }
  lines.push("");
  if (db) {
    lines.push(`  DB-referenced slugs:  ${db.resolved} / ${db.total} still resolve`);
    if (referencedRemoved.length > 0) {
      lines.push("  referenced slugs no longer in upstream:");
      for (const s of referencedRemoved) lines.push(`    ! ${s}`);
    }
  } else {
    lines.push("  DB-referenced slugs:  (skipped, --no-db)");
  }
  return lines.join("\n");
}

async function main() {
  loadEnv();
  const args = parseArgs(process.argv.slice(2));

  const { entries: upstreamRaw, resolvedSha } = await fetchUpstream(args.ref);
  const upstream = normalize(upstreamRaw);
  const current = readCurrent();

  const d = diff(current, upstream);

  let db: DbAuditResult | null = null;
  let referencedRemoved: string[] = [];
  if (!args.noDb) {
    const upstreamIds = new Set(upstream.map((e) => e.id));
    db = await auditDb(upstreamIds);
    referencedRemoved = [...db.referenced].filter((s) => !upstreamIds.has(s));
  }

  const out = report(current, upstream, d, args.ref, resolvedSha, db, referencedRemoved);
  console.log(out);

  const risky = referencedRemoved.length > 0 || d.primaryChanged.length > 0;
  const noChanges =
    d.added.length === 0 &&
    d.removed.length === 0 &&
    d.renamed.length === 0 &&
    d.primaryChanged.length === 0;

  if (args.dryRun) {
    console.log("");
    console.log(noChanges ? "No changes." : "Dry run — not writing.");
    return;
  }

  if (noChanges) {
    console.log("");
    console.log("No changes — leaving file untouched.");
    return;
  }

  if (risky && !args.force) {
    console.log("");
    console.log("BLOCKED: risky changes detected. Re-run with --force to apply.");
    process.exit(1);
  }

  // Preserve the existing single-line compact format so diffs stay reviewable.
  writeFileSync(CATALOG_PATH, JSON.stringify(upstream), "utf-8");
  console.log("");
  console.log(`Wrote ${CATALOG_PATH} (${upstream.length} entries).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
