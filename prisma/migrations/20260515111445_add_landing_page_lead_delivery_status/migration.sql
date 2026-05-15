-- AlterTable
ALTER TABLE "LandingPageLead" ADD COLUMN     "emailError" TEXT,
ADD COLUMN     "emailSentAt" TIMESTAMP(3),
ADD COLUMN     "emailStatus" TEXT,
ADD COLUMN     "lastNotificationAttemptAt" TIMESTAMP(3),
ADD COLUMN     "lastNotificationSuccessAt" TIMESTAMP(3),
ADD COLUMN     "notificationAttempts" INTEGER,
ADD COLUMN     "webhookError" TEXT,
ADD COLUMN     "webhookHttpStatus" INTEGER,
ADD COLUMN     "webhookSentAt" TIMESTAMP(3),
ADD COLUMN     "webhookStatus" TEXT;

-- CreateIndex
CREATE INDEX "LandingPageLead_landingPageId_emailStatus_createdAt_idx" ON "LandingPageLead"("landingPageId", "emailStatus", "createdAt");

-- CreateIndex
CREATE INDEX "LandingPageLead_landingPageId_webhookStatus_createdAt_idx" ON "LandingPageLead"("landingPageId", "webhookStatus", "createdAt");
