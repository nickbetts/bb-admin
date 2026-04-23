// Applies pending Prisma migrations against the production database.
//
// This used to be a bespoke libsql migration runner because `prisma migrate deploy`
// could not talk to Turso over libsql://. Now that we are on Vercel Postgres
// (standard Postgres protocol), we just call the Prisma CLI directly.
//
// Trigger:
//   • Automatically by .github/workflows/db-migrate.yml on push to main when files
//     under prisma/migrations/** change, or via workflow_dispatch.
//   • Manually:  DATABASE_URL=... DIRECT_URL=... node scripts/prod-setup.mjs
import { spawnSync } from "node:child_process";
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Load .env.local for local one-off runs. Vercel/GitHub-Actions inject env vars directly.
config({ path: resolve(__dirname, "../.env.local") });

const url = process.env.DATABASE_URL;
const directUrl = process.env.DIRECT_URL;
const isCi = process.env.CI === "true" || Boolean(process.env.GITHUB_ACTIONS);

if (!url) {
  if (isCi) {
    console.error("DATABASE_URL is required to run migrations.");
    process.exit(1);
  }
  console.log("No DATABASE_URL found — skipping migration (local dev mode)");
  process.exit(0);
}

if (!/^postgres(ql)?:\/\//i.test(url)) {
  console.error(
    `DATABASE_URL must be a Postgres URL (got: ${url.slice(0, 16)}…). ` +
      "Ensure DATABASE_URL is the Vercel Postgres pooled URL (POSTGRES_PRISMA_URL).",
  );
  process.exit(1);
}

if (!directUrl) {
  console.warn(
    "DIRECT_URL is not set — migrations will run through the pooled connection. " +
      "Set DIRECT_URL to POSTGRES_URL_NON_POOLING for safer migration runs.",
  );
}

console.log("→ Running `prisma migrate deploy` against", url.replace(/\/\/[^@]+@/, "//***@"));

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
