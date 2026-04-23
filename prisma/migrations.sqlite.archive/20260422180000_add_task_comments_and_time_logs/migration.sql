-- CreateTable
CREATE TABLE "TaskComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actionItemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TaskComment_actionItemId_fkey" FOREIGN KEY ("actionItemId") REFERENCES "ActionItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskTimeLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actionItemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "durationMs" INTEGER,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TaskTimeLog_actionItemId_fkey" FOREIGN KEY ("actionItemId") REFERENCES "ActionItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskTimeLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TaskComment_actionItemId_createdAt_idx" ON "TaskComment"("actionItemId", "createdAt");

-- CreateIndex
CREATE INDEX "TaskTimeLog_actionItemId_startedAt_idx" ON "TaskTimeLog"("actionItemId", "startedAt");

-- CreateIndex
CREATE INDEX "TaskTimeLog_userId_endedAt_idx" ON "TaskTimeLog"("userId", "endedAt");
