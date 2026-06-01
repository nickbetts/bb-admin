-- AlterTable
ALTER TABLE "LlmTemplate" ADD COLUMN     "ownerEmail" TEXT,
ADD COLUMN     "ownerUserId" TEXT;

-- CreateTable
CREATE TABLE "LlmGeneration" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "userId" TEXT NOT NULL,
    "createdByEmail" TEXT,
    "title" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "templateId" TEXT,
    "templateName" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "output" TEXT NOT NULL,
    "pagesCrawled" INTEGER NOT NULL DEFAULT 0,
    "deadUrlsRemoved" INTEGER NOT NULL DEFAULT 0,
    "usedWebSearchFallback" BOOLEAN NOT NULL DEFAULT false,
    "authorityDataUsed" BOOLEAN NOT NULL DEFAULT false,
    "socialProfilesFound" INTEGER NOT NULL DEFAULT 0,
    "generationMs" INTEGER,
    "shareToken" TEXT,
    "sharePassword" TEXT,
    "shareExpiresAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LlmGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LlmGeneration_shareToken_key" ON "LlmGeneration"("shareToken");

-- CreateIndex
CREATE INDEX "LlmGeneration_clientId_createdAt_idx" ON "LlmGeneration"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "LlmGeneration_userId_createdAt_idx" ON "LlmGeneration"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LlmTemplate_ownerUserId_idx" ON "LlmTemplate"("ownerUserId");

-- AddForeignKey
ALTER TABLE "LlmGeneration" ADD CONSTRAINT "LlmGeneration_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
