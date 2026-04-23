-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "roleId" TEXT,
    "notificationPrefs" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientGoal" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metric" TEXT NOT NULL,
    "channel" TEXT,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION,
    "unit" TEXT,
    "targetDate" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategyDocument" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'strategy',
    "shareToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategyDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetRecommendation" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "periodStart" TEXT NOT NULL,
    "periodEnd" TEXT NOT NULL,
    "recommendations" TEXT NOT NULL,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "shareToken" TEXT,
    "customStartDate" TEXT,
    "customEndDate" TEXT,
    "compareStartDate" TEXT,
    "compareEndDate" TEXT,
    "narrativeData" TEXT,
    "approvalStatus" TEXT,
    "approvalNotes" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "portalPublishedAt" TIMESTAMP(3),
    "portalPublishedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportSection" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "sectionType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "commentary" TEXT,
    "contentText" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "cardConfig" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Screenshot" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "sectionId" TEXT,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Screenshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sections" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleConnection" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoogleConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricSnapshot" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "sectionType" TEXT NOT NULL,
    "periodStart" TEXT NOT NULL,
    "periodEnd" TEXT NOT NULL,
    "metrics" TEXT NOT NULL,
    "campaignData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServerLog" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "source" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServerLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CronLog" (
    "id" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "triggeredBy" TEXT NOT NULL DEFAULT 'cron',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'running',
    "clientsTotal" INTEGER NOT NULL DEFAULT 0,
    "snapshotsNew" INTEGER NOT NULL DEFAULT 0,
    "snapshotsSkipped" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "details" TEXT,

    CONSTRAINT "CronLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiCache" (
    "key" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiCache_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "KeywordPlannerResearch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT,
    "title" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "brief" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '2826',
    "adGroups" TEXT NOT NULL,
    "selectedKws" TEXT NOT NULL,
    "ideas" TEXT NOT NULL,
    "maxCpc" TEXT NOT NULL DEFAULT '',
    "monthlyBudget" TEXT NOT NULL DEFAULT '',
    "conversionRate" TEXT NOT NULL DEFAULT '3',
    "websiteContext" TEXT,
    "proposedServices" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KeywordPlannerResearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT,
    "clientName" TEXT NOT NULL,
    "website" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "servicesJson" TEXT NOT NULL DEFAULT '[]',
    "timelineJson" TEXT NOT NULL DEFAULT '[]',
    "proposalDataJson" TEXT,
    "shareToken" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),
    "researchId" TEXT,
    "pipelineStage" TEXT NOT NULL DEFAULT 'prospect',
    "pipelineNotes" TEXT,
    "expectedValue" DOUBLE PRECISION,
    "closeDate" TEXT,
    "lostReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalEnquiry" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProposalEnquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QaChecklist" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "checklistType" TEXT NOT NULL DEFAULT 'website',
    "label" TEXT,
    "websiteUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "marketingChecks" TEXT NOT NULL DEFAULT '{}',
    "devChecks" TEXT NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "aiSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QaChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LlmTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "description" TEXT,
    "templateText" TEXT NOT NULL,
    "promptGuidance" TEXT,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LlmTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT,
    "type" TEXT NOT NULL,
    "severity" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "metadata" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'in_app',
    "status" TEXT NOT NULL DEFAULT 'unread',
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientConversation" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionItem" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "categoryId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'to_do',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "boardOrder" INTEGER NOT NULL DEFAULT 0,
    "assignedTo" TEXT,
    "dueDate" TEXT,
    "completedAt" TIMESTAMP(3),
    "outcome" TEXT,
    "sourceType" TEXT,
    "sourceRef" TEXT,
    "forApprovalAt" TIMESTAMP(3),
    "internalApprovedBy" TEXT,
    "internalApprovedAt" TIMESTAMP(3),
    "clientApprovedBy" TEXT,
    "clientApprovedAt" TIMESTAMP(3),
    "clientApprovalSource" TEXT,
    "approvalNotes" TEXT,
    "clientPortalUserId" TEXT,
    "clientCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientTaskCategory" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientTaskCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskAssignee" (
    "id" TEXT NOT NULL,
    "actionItemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,

    CONSTRAINT "TaskAssignee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskComment" (
    "id" TEXT NOT NULL,
    "actionItemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskTimeLog" (
    "id" TEXT NOT NULL,
    "actionItemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskTimeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskAttachment" (
    "id" TEXT NOT NULL,
    "actionItemId" TEXT NOT NULL,
    "commentId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientFile" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientCommunication" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'outbound',
    "subject" TEXT NOT NULL,
    "body" TEXT,
    "status" TEXT NOT NULL DEFAULT 'logged',
    "sentAt" TIMESTAMP(3),
    "externalMessageId" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientCommunication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportComment" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "sectionId" TEXT,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitorSnapshot" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "metrics" TEXT NOT NULL,
    "insights" TEXT,
    "periodStart" TEXT NOT NULL,
    "periodEnd" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetitorSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaPlan" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "title" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "totalBudget" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER NOT NULL,
    "startDate" TEXT,
    "channels" TEXT NOT NULL,
    "forecast" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientPortalUser" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "magicToken" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "permissions" TEXT NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientPortalUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetectedAnomaly" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "changePercent" DOUBLE PRECISION NOT NULL,
    "detail" TEXT NOT NULL,
    "rootCauseText" TEXT,
    "actionsTaken" TEXT,
    "periodStart" TEXT NOT NULL,
    "periodEnd" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DetectedAnomaly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClickFraudEvent" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClickFraudEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentStrategy" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "title" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "createdBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'live',
    "generationMs" INTEGER,
    "generationStatus" TEXT NOT NULL DEFAULT 'complete',
    "generationError" TEXT,
    "spreadsheetData" TEXT NOT NULL,
    "generatedHtml" TEXT NOT NULL,
    "shareToken" TEXT,
    "sharePassword" TEXT,
    "portalPublishedAt" TIMESTAMP(3),
    "portalPublishedBy" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentStrategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserActivityLog" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ms365Connection" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ms365Connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingPage" (
    "id" TEXT NOT NULL,
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
    "lastViewedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "portalPublishedAt" TIMESTAMP(3),
    "portalPublishedBy" TEXT,
    "templateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingPageVersion" (
    "id" TEXT NOT NULL,
    "landingPageId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "html" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LandingPageVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingPageLead" (
    "id" TEXT NOT NULL,
    "landingPageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT,
    "formData" TEXT,
    "referrer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LandingPageLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingPageTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "html" TEXT NOT NULL,
    "promptGuidance" TEXT,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingPageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrandPlan" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "statusMessage" TEXT,
    "purpose" TEXT NOT NULL DEFAULT 'pitch',
    "generationMs" INTEGER,
    "generationError" TEXT,
    "proposalId" TEXT,
    "keywordResearchId" TEXT,
    "contentStrategyId" TEXT,
    "mediaPlanId" TEXT,
    "planDataJson" TEXT,
    "generatedHtml" TEXT,
    "configJson" TEXT NOT NULL DEFAULT '{}',
    "campaignFocusPeriodsJson" TEXT NOT NULL DEFAULT '[]',
    "customSectionsJson" TEXT NOT NULL DEFAULT '[]',
    "clientBrief" TEXT,
    "targetAudiences" TEXT,
    "shareToken" TEXT,
    "sharePassword" TEXT,
    "shareExpiresAt" TIMESTAMP(3),
    "portalPublishedAt" TIMESTAMP(3),
    "portalPublishedBy" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrandPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrandPlanVersion" (
    "id" TEXT NOT NULL,
    "grandPlanId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "generatedHtml" TEXT NOT NULL,
    "planDataJson" TEXT,
    "prompt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrandPlanVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientRetainer" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "monthlyFee" DOUBLE PRECISION NOT NULL,
    "contractedHours" DOUBLE PRECISION,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientRetainer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientInvoice" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "invoiceRef" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "issuedDate" TEXT NOT NULL,
    "dueDate" TEXT,
    "paidDate" TEXT,
    "status" TEXT NOT NULL DEFAULT 'issued',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyTimeEntry" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "category" TEXT,
    "notes" TEXT,
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgencyTimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalThread" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "authorType" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachments" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencySubscription" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "category" TEXT,
    "url" TEXT,
    "email" TEXT,
    "loginMethod" TEXT NOT NULL DEFAULT 'password',
    "passwordEnc" TEXT,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
    "renewalDate" TEXT,
    "owner" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgencySubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Client_slug_key" ON "Client"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Client_clickFraudToken_key" ON "Client"("clickFraudToken");

-- CreateIndex
CREATE UNIQUE INDEX "StrategyDocument_shareToken_key" ON "StrategyDocument"("shareToken");

-- CreateIndex
CREATE UNIQUE INDEX "Report_shareToken_key" ON "Report"("shareToken");

-- CreateIndex
CREATE UNIQUE INDEX "MetricSnapshot_clientId_sectionType_periodStart_periodEnd_key" ON "MetricSnapshot"("clientId", "sectionType", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "ServerLog_level_createdAt_idx" ON "ServerLog"("level", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_shareToken_key" ON "Proposal"("shareToken");

-- CreateIndex
CREATE INDEX "ActionItem_clientId_categoryId_status_boardOrder_idx" ON "ActionItem"("clientId", "categoryId", "status", "boardOrder");

-- CreateIndex
CREATE INDEX "ActionItem_clientPortalUserId_status_idx" ON "ActionItem"("clientPortalUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TaskCategory_slug_key" ON "TaskCategory"("slug");

-- CreateIndex
CREATE INDEX "ClientTaskCategory_clientId_sortOrder_idx" ON "ClientTaskCategory"("clientId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ClientTaskCategory_clientId_categoryId_key" ON "ClientTaskCategory"("clientId", "categoryId");

-- CreateIndex
CREATE INDEX "TaskAssignee_userId_idx" ON "TaskAssignee"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskAssignee_actionItemId_userId_key" ON "TaskAssignee"("actionItemId", "userId");

-- CreateIndex
CREATE INDEX "TaskComment_actionItemId_createdAt_idx" ON "TaskComment"("actionItemId", "createdAt");

-- CreateIndex
CREATE INDEX "TaskTimeLog_actionItemId_startedAt_idx" ON "TaskTimeLog"("actionItemId", "startedAt");

-- CreateIndex
CREATE INDEX "TaskTimeLog_userId_endedAt_idx" ON "TaskTimeLog"("userId", "endedAt");

-- CreateIndex
CREATE INDEX "TaskAttachment_actionItemId_createdAt_idx" ON "TaskAttachment"("actionItemId", "createdAt");

-- CreateIndex
CREATE INDEX "TaskAttachment_commentId_idx" ON "TaskAttachment"("commentId");

-- CreateIndex
CREATE INDEX "ClientFile_clientId_createdAt_idx" ON "ClientFile"("clientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClientCommunication_externalMessageId_key" ON "ClientCommunication"("externalMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitorSnapshot_clientId_domain_periodStart_periodEnd_key" ON "CompetitorSnapshot"("clientId", "domain", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "ClientPortalUser_email_key" ON "ClientPortalUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ClientPortalUser_magicToken_key" ON "ClientPortalUser"("magicToken");

-- CreateIndex
CREATE INDEX "DetectedAnomaly_clientId_platform_metric_idx" ON "DetectedAnomaly"("clientId", "platform", "metric");

-- CreateIndex
CREATE INDEX "ClickFraudEvent_clientId_createdAt_idx" ON "ClickFraudEvent"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "ClickFraudEvent_clientId_isSuspicious_idx" ON "ClickFraudEvent"("clientId", "isSuspicious");

-- CreateIndex
CREATE UNIQUE INDEX "ContentStrategy_shareToken_key" ON "ContentStrategy"("shareToken");

-- CreateIndex
CREATE INDEX "ContentStrategy_clientId_createdAt_idx" ON "ContentStrategy"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "UserActivityLog_createdAt_idx" ON "UserActivityLog"("createdAt");

-- CreateIndex
CREATE INDEX "UserActivityLog_userId_createdAt_idx" ON "UserActivityLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserActivityLog_clientId_createdAt_idx" ON "UserActivityLog"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "UserActivityLog_action_createdAt_idx" ON "UserActivityLog"("action", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Ms365Connection_email_key" ON "Ms365Connection"("email");

-- CreateIndex
CREATE UNIQUE INDEX "LandingPage_shareToken_key" ON "LandingPage"("shareToken");

-- CreateIndex
CREATE UNIQUE INDEX "LandingPage_publicSlug_key" ON "LandingPage"("publicSlug");

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

-- CreateIndex
CREATE UNIQUE INDEX "GrandPlan_shareToken_key" ON "GrandPlan"("shareToken");

-- CreateIndex
CREATE INDEX "GrandPlan_clientId_createdAt_idx" ON "GrandPlan"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "GrandPlan_userId_createdAt_idx" ON "GrandPlan"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "GrandPlanVersion_grandPlanId_createdAt_idx" ON "GrandPlanVersion"("grandPlanId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GrandPlanVersion_grandPlanId_versionNumber_key" ON "GrandPlanVersion"("grandPlanId", "versionNumber");

-- CreateIndex
CREATE INDEX "ClientRetainer_clientId_startDate_idx" ON "ClientRetainer"("clientId", "startDate");

-- CreateIndex
CREATE INDEX "ClientInvoice_clientId_paidDate_idx" ON "ClientInvoice"("clientId", "paidDate");

-- CreateIndex
CREATE UNIQUE INDEX "ClientInvoice_clientId_invoiceRef_key" ON "ClientInvoice"("clientId", "invoiceRef");

-- CreateIndex
CREATE INDEX "AgencyTimeEntry_clientId_date_idx" ON "AgencyTimeEntry"("clientId", "date");

-- CreateIndex
CREATE INDEX "AgencyTimeEntry_userId_date_idx" ON "AgencyTimeEntry"("userId", "date");

-- CreateIndex
CREATE INDEX "PortalThread_clientId_lastMessageAt_idx" ON "PortalThread"("clientId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "PortalMessage_threadId_createdAt_idx" ON "PortalMessage"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "AgencySubscription_platform_idx" ON "AgencySubscription"("platform");

-- CreateIndex
CREATE INDEX "AgencySubscription_active_idx" ON "AgencySubscription"("active");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientGoal" ADD CONSTRAINT "ClientGoal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategyDocument" ADD CONSTRAINT "StrategyDocument_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetRecommendation" ADD CONSTRAINT "BudgetRecommendation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportSection" ADD CONSTRAINT "ReportSection_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Screenshot" ADD CONSTRAINT "Screenshot_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricSnapshot" ADD CONSTRAINT "MetricSnapshot_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordPlannerResearch" ADD CONSTRAINT "KeywordPlannerResearch_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_researchId_fkey" FOREIGN KEY ("researchId") REFERENCES "KeywordPlannerResearch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalEnquiry" ADD CONSTRAINT "ProposalEnquiry_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QaChecklist" ADD CONSTRAINT "QaChecklist_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientConversation" ADD CONSTRAINT "ClientConversation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientConversation" ADD CONSTRAINT "ClientConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TaskCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientTaskCategory" ADD CONSTRAINT "ClientTaskCategory_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientTaskCategory" ADD CONSTRAINT "ClientTaskCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TaskCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignee" ADD CONSTRAINT "TaskAssignee_actionItemId_fkey" FOREIGN KEY ("actionItemId") REFERENCES "ActionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignee" ADD CONSTRAINT "TaskAssignee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_actionItemId_fkey" FOREIGN KEY ("actionItemId") REFERENCES "ActionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskTimeLog" ADD CONSTRAINT "TaskTimeLog_actionItemId_fkey" FOREIGN KEY ("actionItemId") REFERENCES "ActionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskTimeLog" ADD CONSTRAINT "TaskTimeLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAttachment" ADD CONSTRAINT "TaskAttachment_actionItemId_fkey" FOREIGN KEY ("actionItemId") REFERENCES "ActionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAttachment" ADD CONSTRAINT "TaskAttachment_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "TaskComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAttachment" ADD CONSTRAINT "TaskAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientFile" ADD CONSTRAINT "ClientFile_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientFile" ADD CONSTRAINT "ClientFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientCommunication" ADD CONSTRAINT "ClientCommunication_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportComment" ADD CONSTRAINT "ReportComment_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorSnapshot" ADD CONSTRAINT "CompetitorSnapshot_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaPlan" ADD CONSTRAINT "MediaPlan_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPortalUser" ADD CONSTRAINT "ClientPortalUser_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetectedAnomaly" ADD CONSTRAINT "DetectedAnomaly_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClickFraudEvent" ADD CONSTRAINT "ClickFraudEvent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentStrategy" ADD CONSTRAINT "ContentStrategy_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingPage" ADD CONSTRAINT "LandingPage_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingPage" ADD CONSTRAINT "LandingPage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingPageVersion" ADD CONSTRAINT "LandingPageVersion_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "LandingPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingPageLead" ADD CONSTRAINT "LandingPageLead_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "LandingPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrandPlan" ADD CONSTRAINT "GrandPlan_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrandPlan" ADD CONSTRAINT "GrandPlan_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrandPlan" ADD CONSTRAINT "GrandPlan_keywordResearchId_fkey" FOREIGN KEY ("keywordResearchId") REFERENCES "KeywordPlannerResearch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrandPlan" ADD CONSTRAINT "GrandPlan_contentStrategyId_fkey" FOREIGN KEY ("contentStrategyId") REFERENCES "ContentStrategy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrandPlan" ADD CONSTRAINT "GrandPlan_mediaPlanId_fkey" FOREIGN KEY ("mediaPlanId") REFERENCES "MediaPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrandPlanVersion" ADD CONSTRAINT "GrandPlanVersion_grandPlanId_fkey" FOREIGN KEY ("grandPlanId") REFERENCES "GrandPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientRetainer" ADD CONSTRAINT "ClientRetainer_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientInvoice" ADD CONSTRAINT "ClientInvoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyTimeEntry" ADD CONSTRAINT "AgencyTimeEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyTimeEntry" ADD CONSTRAINT "AgencyTimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalThread" ADD CONSTRAINT "PortalThread_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalMessage" ADD CONSTRAINT "PortalMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "PortalThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
