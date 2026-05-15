-- CreateTable
CREATE TABLE "LandingPageRefineJob" (
    "id" TEXT NOT NULL,
    "landingPageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "refinementMode" TEXT NOT NULL DEFAULT 'single-pass',
    "prompt" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "stateJson" TEXT NOT NULL DEFAULT '{}',
    "progressMessage" TEXT,
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "finalHtml" TEXT,
    "resultVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingPageRefineJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LandingPageRefineJob_landingPageId_createdAt_idx" ON "LandingPageRefineJob"("landingPageId", "createdAt");

-- CreateIndex
CREATE INDEX "LandingPageRefineJob_userId_createdAt_idx" ON "LandingPageRefineJob"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LandingPageRefineJob_status_createdAt_idx" ON "LandingPageRefineJob"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "LandingPageRefineJob" ADD CONSTRAINT "LandingPageRefineJob_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "LandingPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
