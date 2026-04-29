/**
 * Dry-run the weekly summary computation for one user without sending email.
 *
 *   npx tsx scripts/test-weekly-summary.ts <user-email>
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in .env.local.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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

async function main() {
  loadEnv();
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx scripts/test-weekly-summary.ts <user-email>");
    process.exit(1);
  }

  const { createAdminClient, computeWeeklySummary } = await import(
    "../src/lib/weekly-summary"
  );

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) throw error;
  const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    console.error(`No user with email ${email}`);
    process.exit(1);
  }

  const summary = await computeWeeklySummary(admin, user.id, user.email ?? email);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
