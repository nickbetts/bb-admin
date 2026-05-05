-- CreateTable
CREATE TABLE "KeywordTrackerList" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keywords" TEXT NOT NULL,
    "clientIds" TEXT NOT NULL,
    "database" TEXT NOT NULL DEFAULT 'uk',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KeywordTrackerList_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KeywordTrackerList_userId_updatedAt_idx" ON "KeywordTrackerList"("userId", "updatedAt");
