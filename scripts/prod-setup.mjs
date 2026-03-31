// Idempotent migration script for Turso production database.
// Adds any missing columns that `prisma migrate deploy` can't handle via libsql://.
// Run manually after schema changes, or automatically during Vercel build.
import { createClient } from "@libsql/client";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });
// Vercel builds have env vars injected directly — dotenv is a no-op there.

const url = process.env.DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.log("No Turso credentials found — skipping prod migration (local dev mode)");
  process.exit(0);
}

if (!url.startsWith("libsql://")) {
  console.log("DATABASE_URL is not a libsql URL — skipping prod migration");
  process.exit(0);
}

const db = createClient({ url, authToken });

async function columnExists(table, column) {
  try {
    await db.execute(`SELECT "${column}" FROM "${table}" LIMIT 1`);
    return true;
  } catch {
    return false;
  }
}

async function tableExists(table) {
  try {
    const res = await db.execute(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`);
    return res.rows.length > 0;
  } catch {
    return false;
  }
}

async function main() {
  console.log("→ Checking schema against", url.replace(/\/\/.*@/, "//***@"));

  // ── mustChangePassword (added 2026-03-23) ──────────────────────────────────
  if (!(await columnExists("User", "mustChangePassword"))) {
    await db.execute('ALTER TABLE "User" ADD COLUMN "mustChangePassword" INTEGER NOT NULL DEFAULT 0');
    console.log("✓ Added User.mustChangePassword");
  } else {
    console.log("✓ User.mustChangePassword already present");
  }

  // ── LlmTemplate table (added 2026-03-27) ───────────────────────────────────
  if (!(await tableExists("LlmTemplate"))) {
    await db.execute(`CREATE TABLE IF NOT EXISTS LlmTemplate (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sector TEXT NOT NULL,
      description TEXT,
      templateText TEXT NOT NULL,
      promptGuidance TEXT,
      isBuiltIn INTEGER NOT NULL DEFAULT 0,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log("✓ Created LlmTemplate table");
  } else {
    // Ensure promptGuidance column exists (added 2026-03-27)
    if (!(await columnExists("LlmTemplate", "promptGuidance"))) {
      await db.execute('ALTER TABLE "LlmTemplate" ADD COLUMN "promptGuidance" TEXT');
      console.log("✓ Added LlmTemplate.promptGuidance");
    } else {
      console.log("✓ LlmTemplate table up to date");
    }
  }

  // ── Role table + default roles (added 2026-03-31) ─────────────────────────
  if (!(await tableExists("Role"))) {
    await db.execute(`CREATE TABLE IF NOT EXISTS "Role" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL UNIQUE,
      "permissions" TEXT NOT NULL,
      "isSystem" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log("✓ Created Role table");

    await db.execute(`INSERT INTO "Role" ("id", "name", "permissions", "isSystem", "createdAt", "updatedAt") VALUES
      ('role_standard', 'Standard User', '["dashboard","clients","reports","templates"]', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('role_admin', 'Administrator', '["dashboard","clients","reports","templates","settings","page_analyser","proposal_generator","proposals","pricing","llm_generator","users"]', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    console.log("✓ Seeded default roles (Standard User, Administrator)");
  } else {
    console.log("✓ Role table up to date");
  }

  // ── User.roleId (added 2026-03-31) ─────────────────────────────────────────
  if (!(await columnExists("User", "roleId"))) {
    await db.execute('ALTER TABLE "User" ADD COLUMN "roleId" TEXT REFERENCES "Role"("id") ON DELETE SET NULL');
    console.log("✓ Added User.roleId");
  } else {
    console.log("✓ User.roleId already present");
  }

  // ── Screenshot.sectionId (added 2026-03-31) ────────────────────────────────
  if (!(await columnExists("Screenshot", "sectionId"))) {
    await db.execute('ALTER TABLE "Screenshot" ADD COLUMN "sectionId" TEXT');
    console.log("✓ Added Screenshot.sectionId");
  } else {
    console.log("✓ Screenshot.sectionId already present");
  }

  // ── Report.shareToken (added 2026-03-31) ───────────────────────────────────
  if (!(await columnExists("Report", "shareToken"))) {
    await db.execute('ALTER TABLE "Report" ADD COLUMN "shareToken" TEXT');
    await db.execute('CREATE UNIQUE INDEX IF NOT EXISTS "Report_shareToken_key" ON "Report"("shareToken")');
    console.log("✓ Added Report.shareToken");
  } else {
    console.log("✓ Report.shareToken already present");
  }

  // ── Add future columns here in the same pattern ────────────────────────────

  await db.close();
  console.log("✅ Schema migration complete");
}

main().catch((e) => {
  console.error("Schema migration failed:", e.message);
  process.exit(1);
});

