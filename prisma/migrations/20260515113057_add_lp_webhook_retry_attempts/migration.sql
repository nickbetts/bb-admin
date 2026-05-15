-- AlterTable
ALTER TABLE "LandingPageLead" ADD COLUMN     "nextWebhookRetryAt" TIMESTAMP(3),
ADD COLUMN     "webhookRetryCount" INTEGER;

-- CreateTable
CREATE TABLE "LandingPageLeadWebhookAttempt" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "httpStatus" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LandingPageLeadWebhookAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LandingPageLeadWebhookAttempt_leadId_createdAt_idx" ON "LandingPageLeadWebhookAttempt"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "LandingPageLeadWebhookAttempt_status_createdAt_idx" ON "LandingPageLeadWebhookAttempt"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LandingPageLeadWebhookAttempt_leadId_attemptNumber_key" ON "LandingPageLeadWebhookAttempt"("leadId", "attemptNumber");

-- CreateIndex
CREATE INDEX "LandingPageLead_webhookStatus_nextWebhookRetryAt_idx" ON "LandingPageLead"("webhookStatus", "nextWebhookRetryAt");

-- AddForeignKey
ALTER TABLE "LandingPageLeadWebhookAttempt" ADD CONSTRAINT "LandingPageLeadWebhookAttempt_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "LandingPageLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
