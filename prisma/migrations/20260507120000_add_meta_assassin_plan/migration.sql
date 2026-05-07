-- CreateTable
CREATE TABLE "MetaAssassinPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT,
    "title" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaAssassinPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MetaAssassinPlan_userId_updatedAt_idx" ON "MetaAssassinPlan"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "MetaAssassinPlan_clientId_idx" ON "MetaAssassinPlan"("clientId");
