-- CreateTable
CREATE TABLE "DetectedAnomaly" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    CONSTRAINT "DetectedAnomaly_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StrategyDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'strategy',
    "shareToken" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StrategyDocument_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_StrategyDocument" ("clientId", "content", "createdAt", "id", "period", "shareToken", "title", "updatedAt") SELECT "clientId", "content", "createdAt", "id", "period", "shareToken", "title", "updatedAt" FROM "StrategyDocument";
DROP TABLE "StrategyDocument";
ALTER TABLE "new_StrategyDocument" RENAME TO "StrategyDocument";
CREATE UNIQUE INDEX "StrategyDocument_shareToken_key" ON "StrategyDocument"("shareToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "DetectedAnomaly_clientId_platform_metric_idx" ON "DetectedAnomaly"("clientId", "platform", "metric");
