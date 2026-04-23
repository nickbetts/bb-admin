-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_KeywordPlannerResearch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "clientId" TEXT,
    "title" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "brief" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '2826',
    "adGroups" TEXT NOT NULL,
    "selectedKws" TEXT NOT NULL,
    "ideas" TEXT NOT NULL,
    "maxCpc" TEXT NOT NULL DEFAULT '',
    "monthlyBudget" TEXT NOT NULL DEFAULT '',
    "conversionRate" TEXT NOT NULL DEFAULT '3',
    "websiteContext" TEXT,
    "proposedServices" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "KeywordPlannerResearch_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_KeywordPlannerResearch" ("adGroups", "brief", "conversionRate", "createdAt", "id", "ideas", "location", "maxCpc", "monthlyBudget", "proposedServices", "selectedKws", "title", "updatedAt", "userId", "website", "websiteContext") SELECT "adGroups", "brief", "conversionRate", "createdAt", "id", "ideas", "location", "maxCpc", "monthlyBudget", "proposedServices", "selectedKws", "title", "updatedAt", "userId", "website", "websiteContext" FROM "KeywordPlannerResearch";
DROP TABLE "KeywordPlannerResearch";
ALTER TABLE "new_KeywordPlannerResearch" RENAME TO "KeywordPlannerResearch";
CREATE TABLE "new_Proposal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "clientId" TEXT,
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
    CONSTRAINT "Proposal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Proposal_researchId_fkey" FOREIGN KEY ("researchId") REFERENCES "KeywordPlannerResearch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Proposal" ("clientName", "closeDate", "createdAt", "expectedValue", "html", "id", "lastViewedAt", "lostReason", "pipelineNotes", "pipelineStage", "proposalDataJson", "researchId", "servicesJson", "shareToken", "timelineJson", "title", "updatedAt", "userId", "viewCount", "website") SELECT "clientName", "closeDate", "createdAt", "expectedValue", "html", "id", "lastViewedAt", "lostReason", "pipelineNotes", "pipelineStage", "proposalDataJson", "researchId", "servicesJson", "shareToken", "timelineJson", "title", "updatedAt", "userId", "viewCount", "website" FROM "Proposal";
DROP TABLE "Proposal";
ALTER TABLE "new_Proposal" RENAME TO "Proposal";
CREATE UNIQUE INDEX "Proposal_shareToken_key" ON "Proposal"("shareToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
