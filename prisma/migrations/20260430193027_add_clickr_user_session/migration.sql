/*
  Warnings:

  - A unique constraint covering the columns `[clickrUserId,slug]` on the table `LandingPage` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "LandingPage" ADD COLUMN     "clickrUserId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ClickrUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "planTier" TEXT NOT NULL DEFAULT 'free',
    "planStatus" TEXT NOT NULL DEFAULT 'active',
    "lpsThisMonth" INTEGER NOT NULL DEFAULT 0,
    "billingPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClickrUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClickrSession" (
    "id" TEXT NOT NULL,
    "clickrUserId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClickrSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClickrUser_email_key" ON "ClickrUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ClickrUser_stripeCustomerId_key" ON "ClickrUser"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "ClickrUser_stripeSubscriptionId_key" ON "ClickrUser"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "ClickrUser_email_idx" ON "ClickrUser"("email");

-- CreateIndex
CREATE INDEX "ClickrUser_planTier_idx" ON "ClickrUser"("planTier");

-- CreateIndex
CREATE UNIQUE INDEX "ClickrSession_token_key" ON "ClickrSession"("token");

-- CreateIndex
CREATE INDEX "ClickrSession_clickrUserId_idx" ON "ClickrSession"("clickrUserId");

-- CreateIndex
CREATE INDEX "ClickrSession_token_idx" ON "ClickrSession"("token");

-- CreateIndex
CREATE INDEX "LandingPage_clickrUserId_createdAt_idx" ON "LandingPage"("clickrUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LandingPage_clickrUserId_slug_key" ON "LandingPage"("clickrUserId", "slug");

-- AddForeignKey
ALTER TABLE "LandingPage" ADD CONSTRAINT "LandingPage_clickrUserId_fkey" FOREIGN KEY ("clickrUserId") REFERENCES "ClickrUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClickrSession" ADD CONSTRAINT "ClickrSession_clickrUserId_fkey" FOREIGN KEY ("clickrUserId") REFERENCES "ClickrUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
