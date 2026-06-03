-- AlterTable
ALTER TABLE "TrackingSetup"
ADD COLUMN     "gtmAccountId" TEXT,
ADD COLUMN     "gtmContainerApiId" TEXT,
ADD COLUMN     "gtmWorkspaceId" TEXT DEFAULT '1';

-- CreateTable
CREATE TABLE "GoogleTagManagerConnection" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleTagManagerConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleTagManagerConnection_email_key" ON "GoogleTagManagerConnection"("email");