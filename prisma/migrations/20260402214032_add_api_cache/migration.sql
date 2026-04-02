-- CreateTable
CREATE TABLE "CronLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobName" TEXT NOT NULL,
    "triggeredBy" TEXT NOT NULL DEFAULT 'cron',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'running',
    "clientsTotal" INTEGER NOT NULL DEFAULT 0,
    "snapshotsNew" INTEGER NOT NULL DEFAULT 0,
    "snapshotsSkipped" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "details" TEXT
);

-- CreateTable
CREATE TABLE "ApiCache" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "data" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);
