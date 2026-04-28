-- Add self-referential `previousPlanId` to GrandPlan so a 90-day sprint plan
-- can point at the prior sprint it continues from. Used by the generator to
-- avoid duplicating quick wins / pillars / page optimisations already shipped.
ALTER TABLE "GrandPlan" ADD COLUMN "previousPlanId" TEXT;

CREATE INDEX "GrandPlan_previousPlanId_idx" ON "GrandPlan"("previousPlanId");

ALTER TABLE "GrandPlan" ADD CONSTRAINT "GrandPlan_previousPlanId_fkey"
  FOREIGN KEY ("previousPlanId") REFERENCES "GrandPlan"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
