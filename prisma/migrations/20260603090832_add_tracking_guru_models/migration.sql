-- AlterTable
ALTER TABLE "User" ADD COLUMN     "canManageTracking" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TrackingSetup" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "gtmContainerId" TEXT,
    "ga4PropertyId" TEXT,
    "metaPixelId" TEXT,
    "googleAdsConversionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackingSetup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingEvent" (
    "id" TEXT NOT NULL,
    "trackingSetupId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventCategory" TEXT,
    "eventParameters" JSONB NOT NULL DEFAULT '[]',
    "firingRules" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "TrackingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingAudit" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "auditType" TEXT NOT NULL,
    "findings" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL,
    "auditedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auditedBy" TEXT,

    CONSTRAINT "TrackingAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrackingSetup_clientId_idx" ON "TrackingSetup"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackingSetup_clientId_key" ON "TrackingSetup"("clientId");

-- CreateIndex
CREATE INDEX "TrackingEvent_trackingSetupId_idx" ON "TrackingEvent"("trackingSetupId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackingEvent_trackingSetupId_eventName_key" ON "TrackingEvent"("trackingSetupId", "eventName");

-- CreateIndex
CREATE INDEX "TrackingAudit_clientId_auditType_idx" ON "TrackingAudit"("clientId", "auditType");

-- CreateIndex
CREATE INDEX "TrackingAudit_auditedAt_idx" ON "TrackingAudit"("auditedAt");

-- AddForeignKey
ALTER TABLE "TrackingSetup" ADD CONSTRAINT "TrackingSetup_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingEvent" ADD CONSTRAINT "TrackingEvent_trackingSetupId_fkey" FOREIGN KEY ("trackingSetupId") REFERENCES "TrackingSetup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingAudit" ADD CONSTRAINT "TrackingAudit_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingAudit" ADD CONSTRAINT "TrackingAudit_auditedBy_fkey" FOREIGN KEY ("auditedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
