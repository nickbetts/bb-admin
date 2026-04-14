-- AlterTable: add checklistType and label columns to QaChecklist
ALTER TABLE "QaChecklist" ADD COLUMN "checklistType" TEXT NOT NULL DEFAULT 'website';
ALTER TABLE "QaChecklist" ADD COLUMN "label" TEXT;
