-- AlterTable
ALTER TABLE "Screenshot" ADD COLUMN "sectionId" TEXT;

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "permissions" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LlmTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "description" TEXT,
    "templateText" TEXT NOT NULL,
    "promptGuidance" TEXT,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_KeywordPlannerResearch" (
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
    "websiteContext" TEXT,
    "proposedServices" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_KeywordPlannerResearch" ("adGroups", "brief", "conversionRate", "createdAt", "id", "ideas", "location", "maxCpc", "monthlyBudget", "selectedKws", "title", "updatedAt", "userId", "website", "websiteContext") SELECT "adGroups", "brief", "conversionRate", "createdAt", "id", "ideas", "location", "maxCpc", "monthlyBudget", "selectedKws", "title", "updatedAt", "userId", "website", "websiteContext" FROM "KeywordPlannerResearch";
DROP TABLE "KeywordPlannerResearch";
ALTER TABLE "new_KeywordPlannerResearch" RENAME TO "KeywordPlannerResearch";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "roleId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "email", "id", "mustChangePassword", "name", "password", "role", "updatedAt") SELECT "createdAt", "email", "id", "mustChangePassword", "name", "password", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");
