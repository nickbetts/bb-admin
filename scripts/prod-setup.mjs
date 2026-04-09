// Idempotent migration script for Turso production database.
// Adds any missing columns/tables that `prisma migrate deploy` can't handle via libsql://.
//
// HOW TO ADD A SCHEMA CHANGE:
//   1. Update prisma/schema.prisma with your new model/field.
//   2. Run `npm run db:migrate` locally to generate the Prisma migration file.
//   3. Add the corresponding SQL to this file, wrapped in columnExists/tableExists guards.
//   4. Push/merge to main — the "DB Migrate (Turso)" GitHub Action will run this
//      script automatically against the live Turso database.
//   5. You can also trigger it manually from Actions → DB Migrate (Turso) → Run workflow.
//
// Run locally (requires DATABASE_URL + TURSO_AUTH_TOKEN in .env.local):
//   node scripts/prod-setup.mjs
import { createClient } from "@libsql/client";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });
// Vercel builds have env vars injected directly — dotenv is a no-op there.

const url = process.env.DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
const isVercelBuild = process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);
const isVercelProduction = process.env.VERCEL_ENV === "production";

if (!url || !authToken) {
  if (isVercelBuild && isVercelProduction) {
    console.error(
      "Missing DATABASE_URL or TURSO_AUTH_TOKEN for Vercel build. " +
        "Set both environment variables in Vercel and redeploy."
    );
    process.exit(1);
  }
  if (isVercelBuild) {
    console.log("No Turso credentials found — skipping prod migration (preview/dev Vercel build)");
    process.exit(0);
  }
  console.log("No Turso credentials found — skipping prod migration (local dev mode)");
  process.exit(0);
}

if (!url.startsWith("libsql://")) {
  if (isVercelBuild && isVercelProduction) {
    console.error(
      "DATABASE_URL must be a remote libsql:// URL in Vercel builds. " +
        "Update DATABASE_URL and redeploy."
    );
    process.exit(1);
  }
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

  // ── Client.tiktokAdvertiserId (added Phase 1) ────────────────────────────
  if (!(await columnExists("Client", "tiktokAdvertiserId"))) {
    await db.execute('ALTER TABLE "Client" ADD COLUMN "tiktokAdvertiserId" TEXT');
    console.log("✓ Added Client.tiktokAdvertiserId");
  } else {
    console.log("✓ Client.tiktokAdvertiserId already present");
  }

  // ── Client.tiktokAccessToken (added Phase 1) ───────────────────────────
  if (!(await columnExists("Client", "tiktokAccessToken"))) {
    await db.execute('ALTER TABLE "Client" ADD COLUMN "tiktokAccessToken" TEXT');
    console.log("✓ Added Client.tiktokAccessToken");
  } else {
    console.log("✓ Client.tiktokAccessToken already present");
  }

  // ── Client.microsoftAdsAccountId (added Phase 1) ───────────────────────
  if (!(await columnExists("Client", "microsoftAdsAccountId"))) {
    await db.execute('ALTER TABLE "Client" ADD COLUMN "microsoftAdsAccountId" TEXT');
    console.log("✓ Added Client.microsoftAdsAccountId");
  } else {
    console.log("✓ Client.microsoftAdsAccountId already present");
  }

  // ── Client.microsoftAdsAccountName (added Phase 1) ─────────────────────
  if (!(await columnExists("Client", "microsoftAdsAccountName"))) {
    await db.execute('ALTER TABLE "Client" ADD COLUMN "microsoftAdsAccountName" TEXT');
    console.log("✓ Added Client.microsoftAdsAccountName");
  } else {
    console.log("✓ Client.microsoftAdsAccountName already present");
  }

  // ── Client.cwvUrl (added Phase 1) ──────────────────────────────────────
  if (!(await columnExists("Client", "cwvUrl"))) {
    await db.execute('ALTER TABLE "Client" ADD COLUMN "cwvUrl" TEXT');
    console.log("✓ Added Client.cwvUrl");
  } else {
    console.log("✓ Client.cwvUrl already present");
  }

  // ── Client.reportSchedule (added Phase 1) ──────────────────────────────
  if (!(await columnExists("Client", "reportSchedule"))) {
    await db.execute('ALTER TABLE "Client" ADD COLUMN "reportSchedule" TEXT');
    console.log("✓ Added Client.reportSchedule");
  } else {
    console.log("✓ Client.reportSchedule already present");
  }

  // ── Client.notifyEmail (added Phase 1) ─────────────────────────────────
  if (!(await columnExists("Client", "notifyEmail"))) {
    await db.execute('ALTER TABLE "Client" ADD COLUMN "notifyEmail" TEXT');
    console.log("✓ Added Client.notifyEmail");
  } else {
    console.log("✓ Client.notifyEmail already present");
  }

  // ── Client.linkedinAccountId (added Phase 2) ───────────────────────────
  if (!(await columnExists("Client", "linkedinAccountId"))) {
    await db.execute('ALTER TABLE "Client" ADD COLUMN "linkedinAccountId" TEXT');
    console.log("✓ Added Client.linkedinAccountId");
  } else {
    console.log("✓ Client.linkedinAccountId already present");
  }

  // ── Client.linkedinAccountName (added Phase 2) ─────────────────────────
  if (!(await columnExists("Client", "linkedinAccountName"))) {
    await db.execute('ALTER TABLE "Client" ADD COLUMN "linkedinAccountName" TEXT');
    console.log("✓ Added Client.linkedinAccountName");
  } else {
    console.log("✓ Client.linkedinAccountName already present");
  }

  // ── Client.linkedinAccessToken (added Phase 2) ─────────────────────────
  if (!(await columnExists("Client", "linkedinAccessToken"))) {
    await db.execute('ALTER TABLE "Client" ADD COLUMN "linkedinAccessToken" TEXT');
    console.log("✓ Added Client.linkedinAccessToken");
  } else {
    console.log("✓ Client.linkedinAccessToken already present");
  }

  // ── Client.klaviyoApiKey (added Phase 2) ───────────────────────────────
  if (!(await columnExists("Client", "klaviyoApiKey"))) {
    await db.execute('ALTER TABLE "Client" ADD COLUMN "klaviyoApiKey" TEXT');
    console.log("✓ Added Client.klaviyoApiKey");
  } else {
    console.log("✓ Client.klaviyoApiKey already present");
  }

  // ── Client.klaviyoAccountName (added Phase 2) ──────────────────────────
  if (!(await columnExists("Client", "klaviyoAccountName"))) {
    await db.execute('ALTER TABLE "Client" ADD COLUMN "klaviyoAccountName" TEXT');
    console.log("✓ Added Client.klaviyoAccountName");
  } else {
    console.log("✓ Client.klaviyoAccountName already present");
  }

  // ── User.notificationPrefs (added Phase 1) ─────────────────────────────
  if (!(await columnExists("User", "notificationPrefs"))) {
    await db.execute('ALTER TABLE "User" ADD COLUMN "notificationPrefs" TEXT');
    console.log("✓ Added User.notificationPrefs");
  } else {
    console.log("✓ User.notificationPrefs already present");
  }

  // ── Notification table (added Phase 1) ─────────────────────────────────
  if (!(await tableExists("Notification"))) {
    await db.execute(`CREATE TABLE IF NOT EXISTS "Notification" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "clientId" TEXT,
      "type" TEXT NOT NULL,
      "severity" TEXT,
      "title" TEXT NOT NULL,
      "body" TEXT NOT NULL,
      "metadata" TEXT,
      "channel" TEXT NOT NULL DEFAULT 'in_app',
      "status" TEXT NOT NULL DEFAULT 'unread',
      "deliveredAt" DATETIME,
      "readAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
    )`);
    console.log("✓ Created Notification table");
  } else {
    console.log("✓ Notification table already present");
  }

  // ── ClientConversation table (added Phase 1) ───────────────────────────
  if (!(await tableExists("ClientConversation"))) {
    await db.execute(`CREATE TABLE IF NOT EXISTS "ClientConversation" (
      "id" TEXT PRIMARY KEY,
      "clientId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "role" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "metadata" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE,
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
    )`);
    console.log("✓ Created ClientConversation table");
  } else {
    console.log("✓ ClientConversation table already present");
  }

  // ── ClientGoal table (added Phase 2) ──────────────────────────────────────
  if (!(await tableExists("ClientGoal"))) {
    await db.execute(`CREATE TABLE IF NOT EXISTS "ClientGoal" (
      "id" TEXT PRIMARY KEY,
      "clientId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "metric" TEXT NOT NULL,
      "channel" TEXT,
      "targetValue" REAL NOT NULL,
      "currentValue" REAL,
      "unit" TEXT,
      "targetDate" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'active',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE
    )`);
    console.log("✓ Created ClientGoal table");
  } else {
    console.log("✓ ClientGoal table already present");
  }

  // ── StrategyDocument table (added Phase 2) ────────────────────────────────
  if (!(await tableExists("StrategyDocument"))) {
    await db.execute(`CREATE TABLE IF NOT EXISTS "StrategyDocument" (
      "id" TEXT PRIMARY KEY,
      "clientId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "period" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "shareToken" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE
    )`);
    await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS "StrategyDocument_shareToken_key" ON "StrategyDocument"("shareToken")`);
    console.log("✓ Created StrategyDocument table");
  } else {
    console.log("✓ StrategyDocument table already present");
  }

  // ── BudgetRecommendation table (added Phase 2) ────────────────────────────
  if (!(await tableExists("BudgetRecommendation"))) {
    await db.execute(`CREATE TABLE IF NOT EXISTS "BudgetRecommendation" (
      "id" TEXT PRIMARY KEY,
      "clientId" TEXT NOT NULL,
      "periodStart" TEXT NOT NULL,
      "periodEnd" TEXT NOT NULL,
      "recommendations" TEXT NOT NULL,
      "summary" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE
    )`);
    console.log("✓ Created BudgetRecommendation table");
  } else {
    console.log("✓ BudgetRecommendation table already present");
  }

  // ── Phase 3: Client integrations (added 2026-04-02) ───────────────────────
  const phase3ClientCols = [
    "hubspotPortalId", "hubspotAccessToken",
    "youtubeChannelId", "youtubeChannelName",
    "callrailAccountId", "callrailApiKey",
    "competitorDomains",
  ];
  for (const col of phase3ClientCols) {
    if (!(await columnExists("Client", col))) {
      await db.execute(`ALTER TABLE "Client" ADD COLUMN "${col}" TEXT`);
      console.log(`✓ Added Client.${col}`);
    } else {
      console.log(`✓ Client.${col} already present`);
    }
  }

  // ── Phase 3: Report approval fields (added 2026-04-02) ────────────────────
  const phase3ReportCols = ["approvalStatus", "approvalNotes", "approvedBy", "approvedAt"];
  for (const col of phase3ReportCols) {
    if (!(await columnExists("Report", col))) {
      const colType = col === "approvedAt" ? "DATETIME" : "TEXT";
      await db.execute(`ALTER TABLE "Report" ADD COLUMN "${col}" ${colType}`);
      console.log(`✓ Added Report.${col}`);
    } else {
      console.log(`✓ Report.${col} already present`);
    }
  }

  // ── Phase 3: ActionItem table (added 2026-04-02) ───────────────────────────
  if (!(await tableExists("ActionItem"))) {
    await db.execute(`CREATE TABLE IF NOT EXISTS "ActionItem" (
      "id" TEXT PRIMARY KEY,
      "clientId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "status" TEXT NOT NULL DEFAULT 'open',
      "priority" TEXT NOT NULL DEFAULT 'medium',
      "assignedTo" TEXT,
      "dueDate" TEXT,
      "completedAt" DATETIME,
      "outcome" TEXT,
      "sourceType" TEXT,
      "sourceRef" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE
    )`);
    console.log("✓ Created ActionItem table");
  } else {
    console.log("✓ ActionItem table already present");
  }

  // ── Phase 3: ClientCommunication table (added 2026-04-02) ─────────────────
  if (!(await tableExists("ClientCommunication"))) {
    await db.execute(`CREATE TABLE IF NOT EXISTS "ClientCommunication" (
      "id" TEXT PRIMARY KEY,
      "clientId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "direction" TEXT NOT NULL DEFAULT 'outbound',
      "subject" TEXT NOT NULL,
      "body" TEXT,
      "status" TEXT NOT NULL DEFAULT 'logged',
      "sentAt" DATETIME,
      "metadata" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE
    )`);
    console.log("✓ Created ClientCommunication table");
  } else {
    console.log("✓ ClientCommunication table already present");
  }

  // ── Phase 3: ReportComment table (added 2026-04-02) ───────────────────────
  if (!(await tableExists("ReportComment"))) {
    await db.execute(`CREATE TABLE IF NOT EXISTS "ReportComment" (
      "id" TEXT PRIMARY KEY,
      "reportId" TEXT NOT NULL,
      "sectionId" TEXT,
      "userId" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "resolved" INTEGER NOT NULL DEFAULT 0,
      "parentId" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE
    )`);
    console.log("✓ Created ReportComment table");
  } else {
    console.log("✓ ReportComment table already present");
  }

  // ── Phase 3: CompetitorSnapshot table (added 2026-04-02) ──────────────────
  if (!(await tableExists("CompetitorSnapshot"))) {
    await db.execute(`CREATE TABLE IF NOT EXISTS "CompetitorSnapshot" (
      "id" TEXT PRIMARY KEY,
      "clientId" TEXT NOT NULL,
      "domain" TEXT NOT NULL,
      "metrics" TEXT NOT NULL,
      "insights" TEXT,
      "periodStart" TEXT NOT NULL,
      "periodEnd" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE
    )`);
    await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS "CompetitorSnapshot_clientId_domain_periodStart_periodEnd_key" ON "CompetitorSnapshot"("clientId", "domain", "periodStart", "periodEnd")`);
    console.log("✓ Created CompetitorSnapshot table");
  } else {
    console.log("✓ CompetitorSnapshot table already present");
  }

  // ── Phase 3: MediaPlan table (added 2026-04-02) ────────────────────────────
  if (!(await tableExists("MediaPlan"))) {
    await db.execute(`CREATE TABLE IF NOT EXISTS "MediaPlan" (
      "id" TEXT PRIMARY KEY,
      "clientId" TEXT,
      "title" TEXT NOT NULL,
      "objective" TEXT NOT NULL,
      "totalBudget" REAL NOT NULL,
      "duration" INTEGER NOT NULL,
      "startDate" TEXT,
      "channels" TEXT NOT NULL,
      "forecast" TEXT,
      "status" TEXT NOT NULL DEFAULT 'draft',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL
    )`);
    console.log("✓ Created MediaPlan table");
  } else {
    console.log("✓ MediaPlan table already present");
  }

  // ── Phase 3: ClientPortalUser table (added 2026-04-02) ────────────────────
  if (!(await tableExists("ClientPortalUser"))) {
    await db.execute(`CREATE TABLE IF NOT EXISTS "ClientPortalUser" (
      "id" TEXT PRIMARY KEY,
      "clientId" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "name" TEXT,
      "magicToken" TEXT,
      "tokenExpiry" DATETIME,
      "lastLoginAt" DATETIME,
      "permissions" TEXT NOT NULL DEFAULT '[]',
      "isActive" INTEGER NOT NULL DEFAULT 1,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE
    )`);
    await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS "ClientPortalUser_email_key" ON "ClientPortalUser"("email")`);
    await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS "ClientPortalUser_magicToken_key" ON "ClientPortalUser"("magicToken")`);
    console.log("✓ Created ClientPortalUser table");
  } else {
    console.log("✓ ClientPortalUser table already present");
  }

  // ── Phase 3: Proposal pipeline columns (added 2026-04-02) ─────────────────
  const proposalCols = [
    { name: "pipelineStage", type: "TEXT NOT NULL DEFAULT 'prospect'" },
    { name: "pipelineNotes", type: "TEXT" },
    { name: "expectedValue", type: "REAL" },
    { name: "closeDate", type: "TEXT" },
    { name: "lostReason", type: "TEXT" },
  ];
  for (const { name, type } of proposalCols) {
    if (!(await columnExists("Proposal", name))) {
      await db.execute(`ALTER TABLE "Proposal" ADD COLUMN "${name}" ${type}`);
      console.log(`✓ Added Proposal.${name}`);
    } else {
      console.log(`✓ Proposal.${name} already present`);
    }
  }

  // ── DetectedAnomaly table (added 2026-04-02) ──────────────────────────────
  if (!(await tableExists("DetectedAnomaly"))) {
    await db.execute(`CREATE TABLE IF NOT EXISTS "DetectedAnomaly" (
      "id" TEXT PRIMARY KEY,
      "clientId" TEXT NOT NULL,
      "platform" TEXT NOT NULL,
      "metric" TEXT NOT NULL,
      "severity" TEXT NOT NULL,
      "direction" TEXT NOT NULL,
      "changePercent" REAL NOT NULL,
      "detail" TEXT NOT NULL,
      "rootCauseText" TEXT,
      "actionsTaken" TEXT,
      "periodStart" TEXT NOT NULL,
      "periodEnd" TEXT NOT NULL,
      "resolvedAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE
    )`);
    await db.execute(`CREATE INDEX IF NOT EXISTS "DetectedAnomaly_clientId_platform_metric_idx" ON "DetectedAnomaly"("clientId", "platform", "metric")`);
    console.log("✓ Created DetectedAnomaly table");
  } else {
    console.log("✓ DetectedAnomaly table already present");
  }

  // ── StrategyDocument.type column (added 2026-04-02) ───────────────────────
  if (!(await columnExists("StrategyDocument", "type"))) {
    await db.execute(`ALTER TABLE "StrategyDocument" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'strategy'`);
    console.log("✓ Added StrategyDocument.type");
  } else {
    console.log("✓ StrategyDocument.type already present");
  }

  // ── CronLog table (added 2026-04-02) ──────────────────────────────────────
  if (!(await tableExists("CronLog"))) {
    await db.execute(`CREATE TABLE IF NOT EXISTS "CronLog" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "jobName" TEXT NOT NULL,
      "triggeredBy" TEXT NOT NULL DEFAULT 'cron',
      "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "completedAt" DATETIME,
      "status" TEXT NOT NULL DEFAULT 'running',
      "clientsTotal" INTEGER NOT NULL DEFAULT 0,
      "snapshotsNew" INTEGER NOT NULL DEFAULT 0,
      "snapshotsSkipped" INTEGER NOT NULL DEFAULT 0,
      "errors" INTEGER NOT NULL DEFAULT 0,
      "details" TEXT
    )`);
    await db.execute(`CREATE INDEX IF NOT EXISTS "CronLog_jobName_startedAt_idx" ON "CronLog"("jobName", "startedAt" DESC)`);
    console.log("✓ Created CronLog table");
  } else {
    console.log("✓ CronLog table already present");
  }

  // ── ServerLog table (in-platform log viewer) ──────────────────────────────
  if (!(await tableExists("ServerLog"))) {
    await db.execute(`CREATE TABLE IF NOT EXISTS "ServerLog" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "level" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "source" TEXT,
      "details" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    await db.execute(`CREATE INDEX IF NOT EXISTS "ServerLog_level_createdAt_idx" ON "ServerLog"("level", "createdAt" DESC)`);
    console.log("✓ Created ServerLog table");
  } else {
    console.log("✓ ServerLog table already present");
  }

  // ── Click fraud protection (added 2026-04-04) ─────────────────────────────
  if (!(await columnExists("Client", "clickFraudToken"))) {
    await db.execute('ALTER TABLE "Client" ADD COLUMN "clickFraudToken" TEXT');
    await db.execute('CREATE UNIQUE INDEX IF NOT EXISTS "Client_clickFraudToken_key" ON "Client"("clickFraudToken")');
    console.log("✓ Added Client.clickFraudToken");
  } else {
    console.log("✓ Client.clickFraudToken already present");
  }

  if (!(await tableExists("ClickFraudEvent"))) {
    await db.execute(`CREATE TABLE IF NOT EXISTS "ClickFraudEvent" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "clientId" TEXT NOT NULL,
      "sessionId" TEXT NOT NULL,
      "userAgent" TEXT,
      "ipHash" TEXT,
      "referer" TEXT,
      "utmSource" TEXT,
      "utmMedium" TEXT,
      "utmCampaign" TEXT,
      "isSuspicious" INTEGER NOT NULL DEFAULT 0,
      "reason" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE
    )`);
    await db.execute('CREATE INDEX IF NOT EXISTS "ClickFraudEvent_clientId_createdAt_idx" ON "ClickFraudEvent"("clientId", "createdAt")');
    await db.execute('CREATE INDEX IF NOT EXISTS "ClickFraudEvent_clientId_isSuspicious_idx" ON "ClickFraudEvent"("clientId", "isSuspicious")');
    console.log("✓ Created ClickFraudEvent table");
  } else {
    console.log("✓ ClickFraudEvent table already present");
  }

  // ── Add future columns here in the same pattern ────────────────────────────

  // ── Client.contactEmails (MS365 email sync) ────────────────────────────
  if (!(await columnExists("Client", "contactEmails"))) {
    await db.execute('ALTER TABLE "Client" ADD COLUMN "contactEmails" TEXT');
    console.log("✓ Added Client.contactEmails");
  } else {
    console.log("✓ Client.contactEmails already present");
  }

  // ── ClientCommunication.externalMessageId (MS365 dedup) ───────────────
  if (!(await columnExists("ClientCommunication", "externalMessageId"))) {
    await db.execute('ALTER TABLE "ClientCommunication" ADD COLUMN "externalMessageId" TEXT');
    await db.execute('CREATE INDEX IF NOT EXISTS "ClientCommunication_externalMessageId_idx" ON "ClientCommunication"("externalMessageId")');
    console.log("✓ Added ClientCommunication.externalMessageId");
  } else {
    console.log("✓ ClientCommunication.externalMessageId already present");
  }

  // ── Ms365Connection table (MS365 email sync) ──────────────────────────
  if (!(await tableExists("Ms365Connection"))) {
    await db.execute(`CREATE TABLE IF NOT EXISTS "Ms365Connection" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "label" TEXT NOT NULL,
      "email" TEXT NOT NULL UNIQUE,
      "refreshToken" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log("✓ Created Ms365Connection table");
  } else {
    console.log("✓ Ms365Connection table already present");
  }

  await db.close();
  console.log("✅ Schema migration complete");
}

main().catch((e) => {
  console.error("Schema migration failed:", e.message);
  process.exit(1);
});

