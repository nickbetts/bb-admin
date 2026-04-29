-- AlterTable
ALTER TABLE "GrandPlan"
  ADD COLUMN "presentationHtml" TEXT,
  ADD COLUMN "presentationDataJson" TEXT,
  ADD COLUMN "presentationGeneratedAt" TIMESTAMP(3);
