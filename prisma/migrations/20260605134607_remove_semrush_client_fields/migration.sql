/*
  Warnings:

  - You are about to drop the column `semrushCampaignIds` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `semrushDomain` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `semrushProjectId` on the `Client` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Client" DROP COLUMN "semrushCampaignIds",
DROP COLUMN "semrushDomain",
DROP COLUMN "semrushProjectId";
