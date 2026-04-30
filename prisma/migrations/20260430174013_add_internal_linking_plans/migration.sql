-- CreateTable
CREATE TABLE "InternalLinkingPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT,
    "title" TEXT NOT NULL,
    "targetUrl" TEXT,
    "targetSource" TEXT NOT NULL DEFAULT 'url',
    "targetWordCount" INTEGER,
    "domain" TEXT NOT NULL,
    "moneyPageUrls" JSONB NOT NULL,
    "inputJson" JSONB NOT NULL,
    "resultJson" JSONB,
    "generationStatus" TEXT NOT NULL DEFAULT 'generating',
    "generationError" TEXT,
    "generationMs" INTEGER,
    "shareToken" TEXT,
    "sharePassword" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),
    "portalPublishedAt" TIMESTAMP(3),
    "portalPublishedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternalLinkingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InternalLinkingPlan_shareToken_key" ON "InternalLinkingPlan"("shareToken");

-- CreateIndex
CREATE INDEX "InternalLinkingPlan_userId_createdAt_idx" ON "InternalLinkingPlan"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "InternalLinkingPlan_clientId_createdAt_idx" ON "InternalLinkingPlan"("clientId", "createdAt");

-- AddForeignKey
ALTER TABLE "InternalLinkingPlan" ADD CONSTRAINT "InternalLinkingPlan_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
