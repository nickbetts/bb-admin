// One-time migration: copy every row from the legacy Turso (libSQL/SQLite) database
// into the new Vercel Postgres (Neon) database via Prisma.
//
// Strategy:
//   1. Read the table for each model from Turso using the libsql HTTP client.
//   2. Coerce SQLite-flavoured values into Prisma-friendly shapes
//      (booleans-as-0/1 → true/false, date strings → Date objects).
//   3. Insert into Postgres using Prisma `createMany({ skipDuplicates: true })`,
//      so the script is safe to re-run if a single table errors mid-flight.
//
// Required env (read from .env.local):
//   TURSO_DATABASE_URL  — libsql://<your-db>.turso.io
//   TURSO_AUTH_TOKEN    — Turso JWT
//   DIRECT_URL          — Neon non-pooled URL (used for the bulk load)
//   DATABASE_URL        — Neon pooled URL (fallback)
//
// Usage:
//   node scripts/migrate-turso-to-postgres.mjs --dry-run   # read only, print counts
//   node scripts/migrate-turso-to-postgres.mjs              # do the migration
//   node scripts/migrate-turso-to-postgres.mjs --only Client,Report   # subset
//
// On completion the script prints a row-count comparison per table and exits non-zero
// if any table's destination count is lower than the source count.

import { createClient } from "@libsql/client";
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as dotenvConfig } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: resolve(__dirname, "../.env.local") });

const DRY_RUN = process.argv.includes("--dry-run");
const ONLY_FLAG = process.argv.find((a) => a.startsWith("--only="));
const ONLY = ONLY_FLAG ? ONLY_FLAG.slice("--only=".length).split(",").map((s) => s.trim()) : null;

const tursoUrl = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL;
const tursoAuth = process.env.TURSO_AUTH_TOKEN;
const pgUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!tursoUrl || !tursoUrl.startsWith("libsql://")) {
  console.error("TURSO_DATABASE_URL must be set to a libsql:// URL");
  process.exit(1);
}
if (!tursoAuth) {
  console.error("TURSO_AUTH_TOKEN is required");
  process.exit(1);
}
if (!pgUrl || !/^postgres(ql)?:\/\//i.test(pgUrl)) {
  console.error("DIRECT_URL (or DATABASE_URL) must be set to a postgresql:// URL");
  process.exit(1);
}

const turso = createClient({ url: tursoUrl, authToken: tursoAuth });
const adapter = new PrismaPg({ connectionString: pgUrl });
const prisma = new PrismaClient({ adapter });

// Insert order — parents first, join tables last. Determined manually from
// prisma/schema.prisma relation declarations.
const MODEL_ORDER = [
  "Role",
  "User",
  "Session",
  "AppSetting",
  "Client",
  "GoogleConnection",
  "Ms365Connection",
  "AgencySubscription",
  "ServerLog",
  "CronLog",
  "ApiCache",
  "LlmTemplate",
  "ReportTemplate",
  "LandingPageTemplate",
  "TaskCategory",
  "UserActivityLog",
  "ClientGoal",
  "StrategyDocument",
  "BudgetRecommendation",
  "Report",
  "ReportSection",
  "Screenshot",
  "ReportComment",
  "MetricSnapshot",
  "CompetitorSnapshot",
  "DetectedAnomaly",
  "ClickFraudEvent",
  "ClientCommunication",
  "ClientPortalUser",
  "MediaPlan",
  "KeywordPlannerResearch",
  "ContentStrategy",
  "Proposal",
  "ProposalEnquiry",
  "QaChecklist",
  "Notification",
  "ClientConversation",
  "ActionItem",
  "ClientTaskCategory",
  "TaskAssignee",
  "TaskComment",
  "TaskTimeLog",
  "TaskAttachment",
  "ClientFile",
  "LandingPage",
  "LandingPageVersion",
  "LandingPageLead",
  "GrandPlan",
  "GrandPlanVersion",
  "ClientRetainer",
  "ClientInvoice",
  "AgencyTimeEntry",
  "PortalThread",
  "PortalMessage",
];

// Build a per-model field-type map from the Prisma DMMF so we can coerce values.
// Map shape: { [modelName]: { [fieldName]: { type: "Boolean"|"DateTime"|"Int"|"Float"|"String"|..., isNullable: boolean } } }
const dmmfModels = Prisma.dmmf.datamodel.models;
const fieldTypeMap = {};
for (const m of dmmfModels) {
  const map = {};
  for (const f of m.fields) {
    if (f.kind === "scalar") {
      map[f.name] = { type: f.type, isNullable: !f.isRequired };
    }
  }
  fieldTypeMap[m.name] = map;
}

function coerceRow(modelName, row) {
  const types = fieldTypeMap[modelName];
  if (!types) throw new Error(`No DMMF entry for model ${modelName}`);
  const out = {};
  for (const [field, meta] of Object.entries(types)) {
    if (!(field in row)) continue;
    const v = row[field];
    if (v === null || v === undefined) {
      out[field] = null;
      continue;
    }
    switch (meta.type) {
      case "Boolean":
        out[field] = v === 1 || v === "1" || v === true || v === "true";
        break;
      case "DateTime": {
        // SQLite stores as TEXT (ISO 8601) or INTEGER (unix ms or seconds).
        // libsql returns numbers as JS numbers and TEXT as strings.
        if (typeof v === "number") {
          // Treat values < 1e12 as seconds, otherwise milliseconds.
          out[field] = new Date(v < 1e12 ? v * 1000 : v);
        } else if (typeof v === "bigint") {
          const n = Number(v);
          out[field] = new Date(n < 1e12 ? n * 1000 : n);
        } else {
          out[field] = new Date(v);
        }
        break;
      }
      case "Int":
        out[field] = typeof v === "bigint" ? Number(v) : Number(v);
        break;
      case "BigInt":
        out[field] = typeof v === "bigint" ? v : BigInt(v);
        break;
      case "Float":
      case "Decimal":
        out[field] = typeof v === "string" ? Number(v) : v;
        break;
      default:
        // String / Json / Bytes — pass through.
        out[field] = v;
    }
  }
  return out;
}

async function tableExists(name) {
  const res = await turso.execute({
    sql: "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
    args: [name],
  });
  return res.rows.length > 0;
}

async function readAll(table) {
  const res = await turso.execute(`SELECT * FROM "${table}"`);
  return res.rows.map((row) => {
    // libsql returns rows as objects keyed by column name; coerce bigint→number friendly form here.
    const obj = {};
    for (const [k, v] of Object.entries(row)) {
      obj[k] = typeof v === "bigint" ? Number(v) : v;
    }
    return obj;
  });
}

const BATCH_SIZE = 500;

async function migrateModel(modelName) {
  const exists = await tableExists(modelName);
  if (!exists) {
    console.log(`  ↷ ${modelName.padEnd(28)} (no table in source — skipped)`);
    return { source: 0, written: 0, dest: 0 };
  }

  const rawRows = await readAll(modelName);
  const sourceCount = rawRows.length;

  if (sourceCount === 0) {
    const destCount = await prismaCount(modelName);
    console.log(`  · ${modelName.padEnd(28)} 0 rows`);
    return { source: 0, written: 0, dest: destCount };
  }

  if (DRY_RUN) {
    console.log(`  → ${modelName.padEnd(28)} ${sourceCount} rows (dry-run, not writing)`);
    return { source: sourceCount, written: 0, dest: await prismaCount(modelName) };
  }

  const rows = rawRows.map((r) => coerceRow(modelName, r));
  const delegate = getDelegate(modelName);
  let written = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const result = await delegate.createMany({ data: batch, skipDuplicates: true });
    written += result.count;
  }
  const destCount = await prismaCount(modelName);
  const status = destCount >= sourceCount ? "✓" : "⚠";
  console.log(
    `  ${status} ${modelName.padEnd(28)} src=${sourceCount.toString().padStart(5)}  written=${written
      .toString()
      .padStart(5)}  dest=${destCount.toString().padStart(5)}`,
  );
  return { source: sourceCount, written, dest: destCount };
}

function delegateName(modelName) {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

function getDelegate(modelName) {
  const name = delegateName(modelName);
  const d = prisma[name];
  if (!d) throw new Error(`Prisma delegate not found for ${modelName} (tried prisma.${name})`);
  return d;
}

async function prismaCount(modelName) {
  return getDelegate(modelName).count();
}

async function main() {
  console.log(
    `\n→ Migrating from ${tursoUrl.replace(/\/\/.*@/, "//***@")} to ${pgUrl
      .replace(/\/\/[^@]+@/, "//***@")
      .slice(0, 80)}…`,
  );
  if (DRY_RUN) console.log("  (DRY RUN — no writes)\n");
  if (ONLY) console.log(`  (ONLY: ${ONLY.join(", ")})\n`);

  const results = [];
  const models = ONLY ? MODEL_ORDER.filter((m) => ONLY.includes(m)) : MODEL_ORDER;

  for (const modelName of models) {
    try {
      const r = await migrateModel(modelName);
      results.push({ modelName, ...r });
    } catch (err) {
      console.error(`  ✗ ${modelName.padEnd(28)} ERROR: ${err.message}`);
      results.push({ modelName, source: -1, written: 0, dest: -1, error: err.message });
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log("\n── Summary ──────────────────────────────────────────────────");
  let totalSrc = 0;
  let totalDst = 0;
  let mismatches = 0;
  for (const r of results) {
    totalSrc += Math.max(0, r.source);
    totalDst += Math.max(0, r.dest);
    if (r.source > 0 && r.dest < r.source) mismatches += 1;
    if (r.error) mismatches += 1;
  }
  console.log(`  total source rows : ${totalSrc}`);
  console.log(`  total dest rows   : ${totalDst}`);
  console.log(`  mismatches        : ${mismatches}`);
  if (DRY_RUN) console.log("  (dry-run — no rows were written)");

  await prisma.$disconnect();
  turso.close();
  process.exit(mismatches > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error("Fatal error:", err);
  await prisma.$disconnect().catch(() => {});
  turso.close();
  process.exit(1);
});
