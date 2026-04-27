-- PR1: Grand Plan absorbs Proposals — adds CRM pipeline fields, prospect/orphan
-- support, opt-in enquiry capture, and a new GrandPlanEnquiry table.

ALTER TABLE "GrandPlan"
  ADD COLUMN "prospectName" TEXT,
  ADD COLUMN "prospectWebsite" TEXT,
  ADD COLUMN "pipelineStage" TEXT NOT NULL DEFAULT 'prospect',
  ADD COLUMN "pipelineNotes" TEXT,
  ADD COLUMN "expectedValue" DOUBLE PRECISION,
  ADD COLUMN "closeDate" TEXT,
  ADD COLUMN "lostReason" TEXT,
  ADD COLUMN "enquiryFormEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "GrandPlan_userId_pipelineStage_idx" ON "GrandPlan"("userId", "pipelineStage");

CREATE TABLE "GrandPlanEnquiry" (
  "id"          TEXT NOT NULL,
  "grandPlanId" TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "email"       TEXT NOT NULL,
  "phone"       TEXT,
  "message"     TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GrandPlanEnquiry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GrandPlanEnquiry_grandPlanId_createdAt_idx"
  ON "GrandPlanEnquiry"("grandPlanId", "createdAt");

ALTER TABLE "GrandPlanEnquiry"
  ADD CONSTRAINT "GrandPlanEnquiry_grandPlanId_fkey"
  FOREIGN KEY ("grandPlanId") REFERENCES "GrandPlan"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
