-- AlterTable: add shareToken to Report
ALTER TABLE "Report" ADD COLUMN "shareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Report_shareToken_key" ON "Report"("shareToken");
