-- Add clickFraudToken to Client table
ALTER TABLE "Client" ADD COLUMN "clickFraudToken" TEXT;
CREATE UNIQUE INDEX "Client_clickFraudToken_key" ON "Client"("clickFraudToken");

-- CreateTable
CREATE TABLE "ClickFraudEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "referer" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "isSuspicious" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClickFraudEvent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ClickFraudEvent_clientId_createdAt_idx" ON "ClickFraudEvent"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "ClickFraudEvent_clientId_isSuspicious_idx" ON "ClickFraudEvent"("clientId", "isSuspicious");
