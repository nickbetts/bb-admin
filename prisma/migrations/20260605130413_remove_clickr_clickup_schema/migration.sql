/*
  Warnings:

  - You are about to drop the column `clickrUserId` on the `LandingPage` table. All the data in the column will be lost.
  - You are about to drop the column `clickupLastSyncedAt` on the `SalesHandoff` table. All the data in the column will be lost.
  - You are about to drop the column `clickupListId` on the `SalesHandoff` table. All the data in the column will be lost.
  - You are about to drop the column `clickupSyncStatus` on the `SalesHandoff` table. All the data in the column will be lost.
  - You are about to drop the column `clickupTaskId` on the `SalesHandoff` table. All the data in the column will be lost.
  - You are about to drop the column `clickupTaskUrl` on the `SalesHandoff` table. All the data in the column will be lost.
  - You are about to drop the `ClickrSession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ClickrUser` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ClickrSession" DROP CONSTRAINT "ClickrSession_clickrUserId_fkey";

-- DropForeignKey
ALTER TABLE "LandingPage" DROP CONSTRAINT "LandingPage_clickrUserId_fkey";

-- DropIndex
DROP INDEX "LandingPage_clickrUserId_createdAt_idx";

-- DropIndex
DROP INDEX "LandingPage_clickrUserId_slug_key";

-- DropIndex
DROP INDEX "SalesHandoff_clickupTaskId_key";

-- AlterTable
ALTER TABLE "LandingPage" DROP COLUMN "clickrUserId";

-- AlterTable
ALTER TABLE "SalesHandoff" DROP COLUMN "clickupLastSyncedAt",
DROP COLUMN "clickupListId",
DROP COLUMN "clickupSyncStatus",
DROP COLUMN "clickupTaskId",
DROP COLUMN "clickupTaskUrl",
ALTER COLUMN "status" SET DEFAULT 'plan_requested';

-- DropTable
DROP TABLE "ClickrSession";

-- DropTable
DROP TABLE "ClickrUser";
