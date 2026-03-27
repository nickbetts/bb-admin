-- AlterTable: add shareToken and proposalDataJson to Proposal
ALTER TABLE "Proposal" ADD COLUMN "shareToken" TEXT;
ALTER TABLE "Proposal" ADD COLUMN "proposalDataJson" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_shareToken_key" ON "Proposal"("shareToken");
