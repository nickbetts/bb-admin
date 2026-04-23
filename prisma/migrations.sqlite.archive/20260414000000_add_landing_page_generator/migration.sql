-- CreateTable
CREATE TABLE "LandingPage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "currentHtml" TEXT NOT NULL,
    "briefJson" TEXT NOT NULL,
    "brandContextJson" TEXT NOT NULL,
    "formConfig" TEXT NOT NULL DEFAULT '{}',
    "shareToken" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "templateId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LandingPage_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LandingPageVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "landingPageId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "html" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LandingPageVersion_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "LandingPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LandingPageLead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "landingPageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT,
    "formData" TEXT,
    "referrer" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LandingPageLead_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "LandingPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LandingPageTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "html" TEXT NOT NULL,
    "promptGuidance" TEXT,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "LandingPage_shareToken_key" ON "LandingPage"("shareToken");

-- CreateIndex
CREATE INDEX "LandingPage_clientId_createdAt_idx" ON "LandingPage"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "LandingPage_userId_createdAt_idx" ON "LandingPage"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LandingPage_clientId_slug_key" ON "LandingPage"("clientId", "slug");

-- CreateIndex
CREATE INDEX "LandingPageVersion_landingPageId_createdAt_idx" ON "LandingPageVersion"("landingPageId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LandingPageVersion_landingPageId_versionNumber_key" ON "LandingPageVersion"("landingPageId", "versionNumber");

-- CreateIndex
CREATE INDEX "LandingPageLead_landingPageId_createdAt_idx" ON "LandingPageLead"("landingPageId", "createdAt");
