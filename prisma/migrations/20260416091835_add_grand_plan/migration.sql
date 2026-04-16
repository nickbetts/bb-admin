-- CreateTable
CREATE TABLE "GrandPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "purpose" TEXT NOT NULL DEFAULT 'pitch',
    "generationMs" INTEGER,
    "generationError" TEXT,
    "proposalId" TEXT,
    "keywordResearchId" TEXT,
    "contentStrategyId" TEXT,
    "mediaPlanId" TEXT,
    "planDataJson" TEXT,
    "generatedHtml" TEXT,
    "configJson" TEXT NOT NULL DEFAULT '{}',
    "campaignFocusPeriodsJson" TEXT NOT NULL DEFAULT '[]',
    "customSectionsJson" TEXT NOT NULL DEFAULT '[]',
    "clientBrief" TEXT,
    "shareToken" TEXT,
    "sharePassword" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GrandPlan_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GrandPlan_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GrandPlan_keywordResearchId_fkey" FOREIGN KEY ("keywordResearchId") REFERENCES "KeywordPlannerResearch" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GrandPlan_contentStrategyId_fkey" FOREIGN KEY ("contentStrategyId") REFERENCES "ContentStrategy" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GrandPlan_mediaPlanId_fkey" FOREIGN KEY ("mediaPlanId") REFERENCES "MediaPlan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GrandPlanVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "grandPlanId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "generatedHtml" TEXT NOT NULL,
    "planDataJson" TEXT,
    "prompt" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GrandPlanVersion_grandPlanId_fkey" FOREIGN KEY ("grandPlanId") REFERENCES "GrandPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "GrandPlan_shareToken_key" ON "GrandPlan"("shareToken");

-- CreateIndex
CREATE INDEX "GrandPlan_clientId_createdAt_idx" ON "GrandPlan"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "GrandPlan_userId_createdAt_idx" ON "GrandPlan"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "GrandPlanVersion_grandPlanId_createdAt_idx" ON "GrandPlanVersion"("grandPlanId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GrandPlanVersion_grandPlanId_versionNumber_key" ON "GrandPlanVersion"("grandPlanId", "versionNumber");
