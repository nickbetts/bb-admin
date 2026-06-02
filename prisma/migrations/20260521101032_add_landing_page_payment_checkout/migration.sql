-- AddColumn Client stripe fields
ALTER TABLE "Client" ADD COLUMN "stripeDefaultCurrency" TEXT;
ALTER TABLE "Client" ADD COLUMN "stripePublishableKey" TEXT;
ALTER TABLE "Client" ADD COLUMN "stripeSecretKeyEnc" TEXT;
ALTER TABLE "Client" ADD COLUMN "stripeWebhookSecretEnc" TEXT;

-- AddColumn LandingPageLead payment fields
ALTER TABLE "LandingPageLead" ADD COLUMN "amountPaidCents" INTEGER;
ALTER TABLE "LandingPageLead" ADD COLUMN "currency" TEXT;
ALTER TABLE "LandingPageLead" ADD COLUMN "paymentCompletedAt" TIMESTAMP(3);
ALTER TABLE "LandingPageLead" ADD COLUMN "paymentSessionId" TEXT;
ALTER TABLE "LandingPageLead" ADD COLUMN "paymentStatus" TEXT;
ALTER TABLE "LandingPageLead" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "LandingPageLead" ADD COLUMN "stripePaymentIntentId" TEXT;
ALTER TABLE "LandingPageLead" ADD COLUMN "stripeSessionId" TEXT;

-- CreateTable LandingPagePaymentSession
CREATE TABLE "LandingPagePaymentSession" (
    "id" TEXT NOT NULL,
    "landingPageId" TEXT NOT NULL,
    "clientId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "stripeSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "stripeCustomerId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "pricingMode" TEXT NOT NULL,
    "payloadJson" TEXT,
    "metadataJson" TEXT,
    "successUrl" TEXT,
    "cancelUrl" TEXT,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingPagePaymentSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LandingPagePaymentSession_stripeSessionId_key" ON "LandingPagePaymentSession"("stripeSessionId");
CREATE INDEX "LandingPagePaymentSession_clientId_createdAt_idx" ON "LandingPagePaymentSession"("clientId", "createdAt");
CREATE INDEX "LandingPagePaymentSession_landingPageId_createdAt_idx" ON "LandingPagePaymentSession"("landingPageId", "createdAt");
CREATE INDEX "LandingPagePaymentSession_status_createdAt_idx" ON "LandingPagePaymentSession"("status", "createdAt");

-- CreateIndex on LandingPageLead
CREATE UNIQUE INDEX "LandingPageLead_paymentSessionId_key" ON "LandingPageLead"("paymentSessionId");
CREATE INDEX "LandingPageLead_paymentStatus_createdAt_idx" ON "LandingPageLead"("paymentStatus", "createdAt");
CREATE INDEX "LandingPageLead_stripeSessionId_idx" ON "LandingPageLead"("stripeSessionId");

-- AddForeignKey
ALTER TABLE "LandingPagePaymentSession" ADD CONSTRAINT "LandingPagePaymentSession_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "LandingPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LandingPagePaymentSession" ADD CONSTRAINT "LandingPagePaymentSession_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LandingPageLead" ADD CONSTRAINT "LandingPageLead_paymentSessionId_fkey" FOREIGN KEY ("paymentSessionId") REFERENCES "LandingPagePaymentSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
