-- CreateTable
CREATE TABLE "ServerLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "source" TEXT,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ContentStrategy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "spreadsheetData" TEXT NOT NULL,
    "generatedHtml" TEXT NOT NULL,
    "shareToken" TEXT,
    "sharePassword" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContentStrategy_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ServerLog_level_createdAt_idx" ON "ServerLog"("level", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContentStrategy_shareToken_key" ON "ContentStrategy"("shareToken");

-- CreateIndex
CREATE INDEX "ContentStrategy_clientId_createdAt_idx" ON "ContentStrategy"("clientId", "createdAt");
