-- AlterTable
ALTER TABLE "ActionItem" ADD COLUMN "clientCompletedAt" DATETIME;
ALTER TABLE "ActionItem" ADD COLUMN "clientPortalUserId" TEXT;

-- AlterTable
ALTER TABLE "ContentStrategy" ADD COLUMN "portalPublishedAt" DATETIME;
ALTER TABLE "ContentStrategy" ADD COLUMN "portalPublishedBy" TEXT;

-- AlterTable
ALTER TABLE "GrandPlan" ADD COLUMN "portalPublishedAt" DATETIME;
ALTER TABLE "GrandPlan" ADD COLUMN "portalPublishedBy" TEXT;

-- AlterTable
ALTER TABLE "LandingPage" ADD COLUMN "portalPublishedAt" DATETIME;
ALTER TABLE "LandingPage" ADD COLUMN "portalPublishedBy" TEXT;

-- AlterTable
ALTER TABLE "Report" ADD COLUMN "portalPublishedAt" DATETIME;
ALTER TABLE "Report" ADD COLUMN "portalPublishedBy" TEXT;

-- CreateIndex
CREATE INDEX "ActionItem_clientPortalUserId_status_idx" ON "ActionItem"("clientPortalUserId", "status");
