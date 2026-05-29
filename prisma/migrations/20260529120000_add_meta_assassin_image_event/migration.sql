-- CreateTable
CREATE TABLE "MetaAssassinImageEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetaAssassinImageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MetaAssassinImageEvent_userId_mode_createdAt_idx" ON "MetaAssassinImageEvent"("userId", "mode", "createdAt");

-- CreateIndex
CREATE INDEX "MetaAssassinImageEvent_createdAt_idx" ON "MetaAssassinImageEvent"("createdAt");
