-- CreateTable
CREATE TABLE "SalesHandoff" (
    "id" TEXT NOT NULL,
    "prospectName" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "targetAudienceSummary" TEXT NOT NULL,
    "secondCallAt" TIMESTAMP(3) NOT NULL,
    "interestedServicesJson" TEXT NOT NULL DEFAULT '[]',
    "budgetRange" TEXT NOT NULL,
    "otherInformation" TEXT,
    "urgentOverride" BOOLEAN NOT NULL DEFAULT false,
    "urgentReason" TEXT,
    "hoursUntilCall" DOUBLE PRECISION,
    "noticeStatus" TEXT,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "clickupTaskId" TEXT,
    "clickupTaskUrl" TEXT,
    "clickupListId" TEXT,
    "clickupSyncStatus" TEXT NOT NULL DEFAULT 'not_synced',
    "clickupLastSyncedAt" TIMESTAMP(3),
    "policyEnforce48HourNotice" BOOLEAN NOT NULL DEFAULT true,
    "policyAllowUrgentOverride" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "sourceIdempotencyKey" TEXT,
    "createdByUserId" TEXT,
    "ownerUserId" TEXT,
    "linkedClientId" TEXT,
    "linkedProposalId" TEXT,
    "linkedGrandPlanId" TEXT,
    "linkedActionItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesHandoff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesHandoffEvent" (
    "id" TEXT NOT NULL,
    "handoffId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metadataJson" TEXT,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesHandoffEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SalesHandoff_clickupTaskId_key" ON "SalesHandoff"("clickupTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesHandoff_sourceIdempotencyKey_key" ON "SalesHandoff"("sourceIdempotencyKey");

-- CreateIndex
CREATE INDEX "SalesHandoff_status_createdAt_idx" ON "SalesHandoff"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SalesHandoff_secondCallAt_idx" ON "SalesHandoff"("secondCallAt");

-- CreateIndex
CREATE INDEX "SalesHandoff_createdByUserId_createdAt_idx" ON "SalesHandoff"("createdByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "SalesHandoff_ownerUserId_status_idx" ON "SalesHandoff"("ownerUserId", "status");

-- CreateIndex
CREATE INDEX "SalesHandoff_linkedClientId_createdAt_idx" ON "SalesHandoff"("linkedClientId", "createdAt");

-- CreateIndex
CREATE INDEX "SalesHandoff_linkedProposalId_idx" ON "SalesHandoff"("linkedProposalId");

-- CreateIndex
CREATE INDEX "SalesHandoff_linkedGrandPlanId_idx" ON "SalesHandoff"("linkedGrandPlanId");

-- CreateIndex
CREATE INDEX "SalesHandoff_linkedActionItemId_idx" ON "SalesHandoff"("linkedActionItemId");

-- CreateIndex
CREATE INDEX "SalesHandoffEvent_handoffId_createdAt_idx" ON "SalesHandoffEvent"("handoffId", "createdAt");

-- CreateIndex
CREATE INDEX "SalesHandoffEvent_eventType_createdAt_idx" ON "SalesHandoffEvent"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "SalesHandoffEvent_actorUserId_createdAt_idx" ON "SalesHandoffEvent"("actorUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "SalesHandoff" ADD CONSTRAINT "SalesHandoff_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesHandoff" ADD CONSTRAINT "SalesHandoff_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesHandoff" ADD CONSTRAINT "SalesHandoff_linkedClientId_fkey" FOREIGN KEY ("linkedClientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesHandoff" ADD CONSTRAINT "SalesHandoff_linkedProposalId_fkey" FOREIGN KEY ("linkedProposalId") REFERENCES "Proposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesHandoff" ADD CONSTRAINT "SalesHandoff_linkedGrandPlanId_fkey" FOREIGN KEY ("linkedGrandPlanId") REFERENCES "GrandPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesHandoff" ADD CONSTRAINT "SalesHandoff_linkedActionItemId_fkey" FOREIGN KEY ("linkedActionItemId") REFERENCES "ActionItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesHandoffEvent" ADD CONSTRAINT "SalesHandoffEvent_handoffId_fkey" FOREIGN KEY ("handoffId") REFERENCES "SalesHandoff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesHandoffEvent" ADD CONSTRAINT "SalesHandoffEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
