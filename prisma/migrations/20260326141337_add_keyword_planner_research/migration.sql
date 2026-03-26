-- CreateTable
CREATE TABLE "KeywordPlannerResearch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
