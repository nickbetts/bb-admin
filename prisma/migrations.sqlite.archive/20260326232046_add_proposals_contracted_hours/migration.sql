-- AlterTable
ALTER TABLE "Client" ADD COLUMN "contractedHours" TEXT;

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "website" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "servicesJson" TEXT NOT NULL DEFAULT '[]',
    "timelineJson" TEXT NOT NULL DEFAULT '[]',
    "researchId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Proposal_researchId_fkey" FOREIGN KEY ("researchId") REFERENCES "KeywordPlannerResearch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
