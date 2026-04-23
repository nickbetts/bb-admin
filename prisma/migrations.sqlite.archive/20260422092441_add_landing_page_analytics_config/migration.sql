-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "website" TEXT,
    "logoUrl" TEXT,
    "ga4PropertyId" TEXT,
    "ga4PropertyName" TEXT,
    "semrushDomain" TEXT,
    "semrushProjectId" INTEGER,
    "semrushCampaignIds" TEXT,
    "metaAccountId" TEXT,
    "metaAccountName" TEXT,
    "metaAccessToken" TEXT,
    "gaCredentials" TEXT,
    "googleAdsCustomerId" TEXT,
    "googleAdsAccountName" TEXT,
    "searchConsoleSiteUrl" TEXT,
    "aiReportInstructions" TEXT,
    "woocommerceUrl" TEXT,
    "woocommerceKey" TEXT,
    "woocommerceSecret" TEXT,
    "shopifyStoreDomain" TEXT,
    "shopifyAccessToken" TEXT,
    "contractedHours" TEXT,
    "tiktokAdvertiserId" TEXT,
    "tiktokAccessToken" TEXT,
    "microsoftAdsAccountId" TEXT,
    "microsoftAdsAccountName" TEXT,
    "cwvUrl" TEXT,
    "reportSchedule" TEXT,
    "notifyEmail" TEXT,
    "linkedinAccountId" TEXT,
    "linkedinAccountName" TEXT,
    "linkedinAccessToken" TEXT,
    "klaviyoApiKey" TEXT,
    "klaviyoAccountName" TEXT,
    "hubspotPortalId" TEXT,
    "hubspotAccessToken" TEXT,
    "youtubeChannelId" TEXT,
    "youtubeChannelName" TEXT,
    "callrailAccountId" TEXT,
    "callrailApiKey" TEXT,
    "competitorDomains" TEXT,
    "clickFraudToken" TEXT,
    "contactEmails" TEXT,
    "contentStrategyLimits" TEXT,
    "defaultAnalyticsConfig" TEXT NOT NULL DEFAULT '{}',
    "signalConfig" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Client" ("aiReportInstructions", "callrailAccountId", "callrailApiKey", "clickFraudToken", "competitorDomains", "contactEmails", "contentStrategyLimits", "contractedHours", "createdAt", "cwvUrl", "ga4PropertyId", "ga4PropertyName", "gaCredentials", "googleAdsAccountName", "googleAdsCustomerId", "hubspotAccessToken", "hubspotPortalId", "id", "klaviyoAccountName", "klaviyoApiKey", "linkedinAccessToken", "linkedinAccountId", "linkedinAccountName", "logoUrl", "metaAccessToken", "metaAccountId", "metaAccountName", "microsoftAdsAccountId", "microsoftAdsAccountName", "name", "notifyEmail", "reportSchedule", "searchConsoleSiteUrl", "semrushCampaignIds", "semrushDomain", "semrushProjectId", "shopifyAccessToken", "shopifyStoreDomain", "signalConfig", "slug", "status", "tiktokAccessToken", "tiktokAdvertiserId", "updatedAt", "website", "woocommerceKey", "woocommerceSecret", "woocommerceUrl", "youtubeChannelId", "youtubeChannelName") SELECT "aiReportInstructions", "callrailAccountId", "callrailApiKey", "clickFraudToken", "competitorDomains", "contactEmails", "contentStrategyLimits", "contractedHours", "createdAt", "cwvUrl", "ga4PropertyId", "ga4PropertyName", "gaCredentials", "googleAdsAccountName", "googleAdsCustomerId", "hubspotAccessToken", "hubspotPortalId", "id", "klaviyoAccountName", "klaviyoApiKey", "linkedinAccessToken", "linkedinAccountId", "linkedinAccountName", "logoUrl", "metaAccessToken", "metaAccountId", "metaAccountName", "microsoftAdsAccountId", "microsoftAdsAccountName", "name", "notifyEmail", "reportSchedule", "searchConsoleSiteUrl", "semrushCampaignIds", "semrushDomain", "semrushProjectId", "shopifyAccessToken", "shopifyStoreDomain", "signalConfig", "slug", "status", "tiktokAccessToken", "tiktokAdvertiserId", "updatedAt", "website", "woocommerceKey", "woocommerceSecret", "woocommerceUrl", "youtubeChannelId", "youtubeChannelName" FROM "Client";
DROP TABLE "Client";
ALTER TABLE "new_Client" RENAME TO "Client";
CREATE UNIQUE INDEX "Client_slug_key" ON "Client"("slug");
CREATE UNIQUE INDEX "Client_clickFraudToken_key" ON "Client"("clickFraudToken");
CREATE TABLE "new_LandingPage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "currentHtml" TEXT NOT NULL,
    "briefJson" TEXT NOT NULL,
    "brandContextJson" TEXT NOT NULL,
    "formConfig" TEXT NOT NULL DEFAULT '{}',
    "analyticsConfig" TEXT NOT NULL DEFAULT '{}',
    "shareToken" TEXT,
    "publicSlug" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "templateId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LandingPage_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LandingPage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_LandingPage" ("brandContextJson", "briefJson", "clientId", "createdAt", "currentHtml", "formConfig", "id", "lastViewedAt", "publicSlug", "shareToken", "slug", "status", "templateId", "title", "updatedAt", "userId", "viewCount") SELECT "brandContextJson", "briefJson", "clientId", "createdAt", "currentHtml", "formConfig", "id", "lastViewedAt", "publicSlug", "shareToken", "slug", "status", "templateId", "title", "updatedAt", "userId", "viewCount" FROM "LandingPage";
DROP TABLE "LandingPage";
ALTER TABLE "new_LandingPage" RENAME TO "LandingPage";
CREATE UNIQUE INDEX "LandingPage_shareToken_key" ON "LandingPage"("shareToken");
CREATE UNIQUE INDEX "LandingPage_publicSlug_key" ON "LandingPage"("publicSlug");
CREATE INDEX "LandingPage_clientId_createdAt_idx" ON "LandingPage"("clientId", "createdAt");
CREATE INDEX "LandingPage_userId_createdAt_idx" ON "LandingPage"("userId", "createdAt");
CREATE UNIQUE INDEX "LandingPage_clientId_slug_key" ON "LandingPage"("clientId", "slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
