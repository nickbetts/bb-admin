-- CreateTable
CREATE TABLE "AgencySubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL,
    "category" TEXT,
    "url" TEXT,
    "email" TEXT,
    "passwordEnc" TEXT,
    "cost" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
    "renewalDate" TEXT,
    "owner" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "AgencySubscription_platform_idx" ON "AgencySubscription"("platform");

-- CreateIndex
CREATE INDEX "AgencySubscription_active_idx" ON "AgencySubscription"("active");
