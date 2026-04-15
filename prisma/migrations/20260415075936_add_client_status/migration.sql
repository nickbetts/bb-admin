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
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Client" ("aiReportInstructions", "callrailAccountId", "callrailApiKey", "clickFraudToken", "competitorDomains", "contactEmails", "contentStrategyLimits", "contractedHours", "createdAt", "cwvUrl", "ga4PropertyId", "ga4PropertyName", "gaCredentials", "googleAdsAccountName", "googleAdsCustomerId", "hubspotAccessToken", "hubspotPortalId", "id", "klaviyoAccountName", "klaviyoApiKey", "linkedinAccessToken", "linkedinAccountId", "linkedinAccountName", "logoUrl", "metaAccessToken", "metaAccountId", "metaAccountName", "microsoftAdsAccountId", "microsoftAdsAccountName", "name", "notifyEmail", "reportSchedule", "searchConsoleSiteUrl", "semrushCampaignIds", "semrushDomain", "semrushProjectId", "shopifyAccessToken", "shopifyStoreDomain", "slug", "tiktokAccessToken", "tiktokAdvertiserId", "updatedAt", "website", "woocommerceKey", "woocommerceSecret", "woocommerceUrl", "youtubeChannelId", "youtubeChannelName") SELECT "aiReportInstructions", "callrailAccountId", "callrailApiKey", "clickFraudToken", "competitorDomains", "contactEmails", "contentStrategyLimits", "contractedHours", "createdAt", "cwvUrl", "ga4PropertyId", "ga4PropertyName", "gaCredentials", "googleAdsAccountName", "googleAdsCustomerId", "hubspotAccessToken", "hubspotPortalId", "id", "klaviyoAccountName", "klaviyoApiKey", "linkedinAccessToken", "linkedinAccountId", "linkedinAccountName", "logoUrl", "metaAccessToken", "metaAccountId", "metaAccountName", "microsoftAdsAccountId", "microsoftAdsAccountName", "name", "notifyEmail", "reportSchedule", "searchConsoleSiteUrl", "semrushCampaignIds", "semrushDomain", "semrushProjectId", "shopifyAccessToken", "shopifyStoreDomain", "slug", "tiktokAccessToken", "tiktokAdvertiserId", "updatedAt", "website", "woocommerceKey", "woocommerceSecret", "woocommerceUrl", "youtubeChannelId", "youtubeChannelName" FROM "Client";
DROP TABLE "Client";
ALTER TABLE "new_Client" RENAME TO "Client";
CREATE UNIQUE INDEX "Client_slug_key" ON "Client"("slug");
CREATE UNIQUE INDEX "Client_clickFraudToken_key" ON "Client"("clickFraudToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
