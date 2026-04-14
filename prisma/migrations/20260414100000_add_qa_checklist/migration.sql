-- AlterTable
ALTER TABLE "Client" ADD COLUMN "contactEmails" TEXT;
ALTER TABLE "Client" ADD COLUMN "contentStrategyLimits" TEXT;

-- AlterTable
ALTER TABLE "ClientCommunication" ADD COLUMN "externalMessageId" TEXT;

-- AlterTable
ALTER TABLE "ContentStrategy" ADD COLUMN "generationMs" INTEGER;

-- CreateTable
CREATE TABLE "QaChecklist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "marketingChecks" TEXT NOT NULL DEFAULT '{}',
    "devChecks" TEXT NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "aiSummary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QaChecklist_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Ms365Connection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Ms365Connection_email_key" ON "Ms365Connection"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ClientCommunication_externalMessageId_key" ON "ClientCommunication"("externalMessageId");
