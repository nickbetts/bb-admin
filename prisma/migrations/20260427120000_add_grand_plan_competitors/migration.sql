-- Add competitorsJson to GrandPlan: stores form-supplied + auto-detected
-- competitor list captured at plan-creation time (with optional pageContext
-- and SEMrush common-keyword count) so AI generation is deterministic.
ALTER TABLE "GrandPlan" ADD COLUMN "competitorsJson" TEXT NOT NULL DEFAULT '[]';
