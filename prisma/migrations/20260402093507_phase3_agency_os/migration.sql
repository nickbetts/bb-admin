-- AlterTable
ALTER TABLE "Client" ADD COLUMN "callrailAccountId" TEXT;
ALTER TABLE "Client" ADD COLUMN "callrailApiKey" TEXT;
ALTER TABLE "Client" ADD COLUMN "competitorDomains" TEXT;
ALTER TABLE "Client" ADD COLUMN "hubspotAccessToken" TEXT;
ALTER TABLE "Client" ADD COLUMN "hubspotPortalId" TEXT;
ALTER TABLE "Client" ADD COLUMN "youtubeChannelId" TEXT;
ALTER TABLE "Client" ADD COLUMN "youtubeChannelName" TEXT;

-- AlterTable
ALTER TABLE "Report" ADD COLUMN "approvalNotes" TEXT;
ALTER TABLE "Report" ADD COLUMN "approvalStatus" TEXT;
ALTER TABLE "Report" ADD COLUMN "approvedAt" DATETIME;
ALTER TABLE "Report" ADD COLUMN "approvedBy" TEXT;

-- CreateTable
CREATE TABLE "ActionItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ActionItem_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClientCommunication" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClientCommunication_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReportComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "sectionId" TEXT,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReportComment_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CompetitorSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "metrics" TEXT NOT NULL,
    "insights" TEXT,
    "periodStart" TEXT NOT NULL,
    "periodEnd" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompetitorSnapshot_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MediaPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MediaPlan_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClientPortalUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "magicToken" TEXT,
    "tokenExpiry" DATETIME,
    "lastLoginAt" DATETIME,
    "permissions" TEXT NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClientPortalUser_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Proposal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "website" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "servicesJson" TEXT NOT NULL DEFAULT '[]',
    "timelineJson" TEXT NOT NULL DEFAULT '[]',
    "proposalDataJson" TEXT,
    "shareToken" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" DATETIME,
    "researchId" TEXT,
    "pipelineStage" TEXT NOT NULL DEFAULT 'prospect',
    "pipelineNotes" TEXT,
    "expectedValue" REAL,
    "closeDate" TEXT,
    "lostReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Proposal_researchId_fkey" FOREIGN KEY ("researchId") REFERENCES "KeywordPlannerResearch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Proposal" ("clientName", "createdAt", "html", "id", "lastViewedAt", "proposalDataJson", "researchId", "servicesJson", "shareToken", "timelineJson", "title", "updatedAt", "userId", "viewCount", "website") SELECT "clientName", "createdAt", "html", "id", "lastViewedAt", "proposalDataJson", "researchId", "servicesJson", "shareToken", "timelineJson", "title", "updatedAt", "userId", "viewCount", "website" FROM "Proposal";
DROP TABLE "Proposal";
ALTER TABLE "new_Proposal" RENAME TO "Proposal";
CREATE UNIQUE INDEX "Proposal_shareToken_key" ON "Proposal"("shareToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "CompetitorSnapshot_clientId_domain_periodStart_periodEnd_key" ON "CompetitorSnapshot"("clientId", "domain", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "ClientPortalUser_email_key" ON "ClientPortalUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ClientPortalUser_magicToken_key" ON "ClientPortalUser"("magicToken");
