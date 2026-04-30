-- CreateTable
CREATE TABLE "ContentGenerator" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brief" TEXT NOT NULL,
    "contentTypes" TEXT NOT NULL DEFAULT '[]',
    "websiteUrl" TEXT,
    "competitorsJson" TEXT NOT NULL DEFAULT '[]',
    "keywordResearchJson" TEXT,
    "ideasJson" TEXT,
    "selectedIdeasJson" TEXT,
    "generatedContentJson" TEXT,
    "generatedHtml" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "statusMessage" TEXT,
    "generationError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentGenerator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentGenerator_clientId_createdAt_idx" ON "ContentGenerator"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "ContentGenerator_userId_createdAt_idx" ON "ContentGenerator"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "ContentGenerator" ADD CONSTRAINT "ContentGenerator_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
