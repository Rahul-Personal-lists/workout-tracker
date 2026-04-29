/**
 * Render the weekly-summary email to HTML using a real user's data and open it
 * in your default browser. No email is sent.
 *
 *   npx tsx scripts/preview-weekly-email.ts <user-email>
 *
 * For images to load, run `npm run dev` in another terminal and ensure
 * NEXT_PUBLIC_APP_URL=http://localhost:3000 in .env.local.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { exec } from "node:child_process";

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
    console.error("Usage: npx tsx scripts/preview-weekly-email.ts <user-email>");
    process.exit(1);
  }

  const { createAdminClient, computeWeeklySummary } = await import(
    "../src/lib/weekly-summary"
  );
  const { WeeklySummaryEmail } = await import("../src/emails/weekly-summary");
  const { render } = await import("@react-email/render");

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) throw error;
  const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    console.error(`No user with email ${email}`);
    process.exit(1);
  }

  const summary = await computeWeeklySummary(admin, user.id, user.email ?? email);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const html = await render(WeeklySummaryEmail({ summary, appUrl }));

  const outDir = resolve(process.cwd(), ".preview");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "weekly-summary.html");
  writeFileSync(outPath, html, "utf-8");

  console.log(`Wrote ${outPath}`);
  console.log(`Image base URL: ${appUrl}`);
  console.log("Tip: run `npm run dev` so the muscle image at /muscle-images/*.png resolves.");

  const opener =
    process.platform === "win32"
      ? `start "" "${outPath}"`
      : process.platform === "darwin"
        ? `open "${outPath}"`
        : `xdg-open "${outPath}"`;
  exec(opener);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
