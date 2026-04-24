-- CreateTable
CREATE TABLE "AdImageSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT,
    "title" TEXT NOT NULL,
    "size" TEXT NOT NULL DEFAULT '1024x1024',
    "messages" TEXT NOT NULL DEFAULT '[]',
    "currentImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdImageSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdImageSession_userId_idx" ON "AdImageSession"("userId");

-- CreateIndex
CREATE INDEX "AdImageSession_clientId_idx" ON "AdImageSession"("clientId");
