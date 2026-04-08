-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ContentStrategy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT,
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
INSERT INTO "new_ContentStrategy" ("clientId", "createdAt", "generatedHtml", "id", "lastViewedAt", "period", "sharePassword", "shareToken", "spreadsheetData", "title", "updatedAt", "viewCount") SELECT "clientId", "createdAt", "generatedHtml", "id", "lastViewedAt", "period", "sharePassword", "shareToken", "spreadsheetData", "title", "updatedAt", "viewCount" FROM "ContentStrategy";
DROP TABLE "ContentStrategy";
ALTER TABLE "new_ContentStrategy" RENAME TO "ContentStrategy";
CREATE UNIQUE INDEX "ContentStrategy_shareToken_key" ON "ContentStrategy"("shareToken");
CREATE INDEX "ContentStrategy_clientId_createdAt_idx" ON "ContentStrategy"("clientId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
