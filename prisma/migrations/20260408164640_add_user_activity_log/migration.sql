-- CreateTable
CREATE TABLE "UserActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "userEmail" TEXT,
    "userName" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "clientId" TEXT,
    "clientName" TEXT,
    "description" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "UserActivityLog_createdAt_idx" ON "UserActivityLog"("createdAt");

-- CreateIndex
CREATE INDEX "UserActivityLog_userId_createdAt_idx" ON "UserActivityLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserActivityLog_clientId_createdAt_idx" ON "UserActivityLog"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "UserActivityLog_action_createdAt_idx" ON "UserActivityLog"("action", "createdAt");
