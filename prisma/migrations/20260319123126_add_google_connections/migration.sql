-- AlterTable
ALTER TABLE "Client" ADD COLUMN "ga4PropertyName" TEXT;
ALTER TABLE "Client" ADD COLUMN "googleAdsAccountName" TEXT;

-- CreateTable
CREATE TABLE "GoogleConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
