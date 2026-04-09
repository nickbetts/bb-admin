// Microsoft Advertising (Bing Ads) API integration
// Uses the Microsoft Advertising REST API v13

const MS_ADS_API_BASE = "https://reporting.api.bingads.microsoft.com/Reporting/v13";
const MS_ADS_CAMPAIGN_BASE = "https://campaign.api.bingads.microsoft.com/Api/v13/CampaignManagement";

export interface MicrosoftAdsOverview {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  revenue: number;
  roas: number;
  costPerConversion: number;
  impressionSharePercent: number;
}

export interface MicrosoftAdsCampaign {
  campaignId: string;
  campaignName: string;
  status: string;
  budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  revenue: number;
  roas: number;
}

export interface MicrosoftAdsDailyData {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
}

// ─── Token management ──────────────────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
  const refreshToken = process.env.MICROSOFT_ADS_REFRESH_TOKEN;
  const clientId = process.env.MICROSOFT_ADS_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_ADS_CLIENT_SECRET;

  if (!refreshToken || !clientId) {
    throw new Error("Microsoft Advertising credentials not configured");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: "https://ads.microsoft.com/msads.manage",
  });

  if (clientSecret) {
    params.set("client_secret", clientSecret);
  }

  const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`Microsoft OAuth error: ${data.error_description || data.error}`);
  }

  return data.access_token;
}

// ─── API call helper ───────────────────────────────────────────────────────────

async function msAdsFetch(
  url: string,
  accessToken: string,
  accountId: string,
  body?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    CustomerAccountId: accountId,
    DeveloperToken: process.env.MICROSOFT_ADS_DEVELOPER_TOKEN ?? "",
  };

  if (process.env.MICROSOFT_ADS_CUSTOMER_ID) {
    headers.CustomerId = process.env.MICROSOFT_ADS_CUSTOMER_ID;
  }

  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`Microsoft Ads API error (${response.status}): ${await response.text()}`);
  }

  return response.json();
}

// ─── Data fetching functions ───────────────────────────────────────────────────

export async function getMicrosoftAdsOverview(
  accountId: string,
  startDate: string,
  endDate: string
): Promise<MicrosoftAdsOverview> {
  const accessToken = await getAccessToken();

  const reportRequest = {
    ReportRequest: {
      ExcludeColumnHeaders: false,
      ExcludeReportFooter: true,
      ExcludeReportHeader: true,
      Format: "Json",
      ReturnOnlyCompleteData: false,
      Type: "AccountPerformanceReportRequest",
      Aggregation: "Summary",
      Columns: [
        "Spend", "Impressions", "Clicks", "Ctr", "AverageCpc",
        "Conversions", "Revenue", "ReturnOnAdSpend", "CostPerConversion",
        "ImpressionSharePercent",
      ],
      Time: {
        CustomDateRangeStart: { Day: parseInt(startDate.split("-")[2]), Month: parseInt(startDate.split("-")[1]), Year: parseInt(startDate.split("-")[0]) },
        CustomDateRangeEnd: { Day: parseInt(endDate.split("-")[2]), Month: parseInt(endDate.split("-")[1]), Year: parseInt(endDate.split("-")[0]) },
      },
    },
  };

  await msAdsFetch(
    `${MS_ADS_API_BASE}/SubmitGenerateReport`,
    accessToken,
    accountId,
    reportRequest
  );

  // For a simpler initial implementation, use the Campaign Management API
  // to get account-level metrics
  const campaignsData = await getCampaignsRaw(accessToken, accountId, startDate, endDate);

  // Aggregate from campaigns
  let totalSpend = 0, totalImpressions = 0, totalClicks = 0, totalConversions = 0, totalRevenue = 0;
  for (const c of campaignsData) {
    totalSpend += c.spend;
    totalImpressions += c.impressions;
    totalClicks += c.clicks;
    totalConversions += c.conversions;
    totalRevenue += c.revenue;
  }

  return {
    spend: totalSpend,
    impressions: totalImpressions,
    clicks: totalClicks,
    ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
    cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
    conversions: totalConversions,
    revenue: totalRevenue,
    roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
    costPerConversion: totalConversions > 0 ? totalSpend / totalConversions : 0,
    impressionSharePercent: 0,
  };
}

async function getCampaignsRaw(
  accessToken: string,
  accountId: string,
  _startDate: string,
  _endDate: string
): Promise<MicrosoftAdsCampaign[]> {
  try {
    const data = await msAdsFetch(
      `${MS_ADS_CAMPAIGN_BASE}/GetCampaignsByAccountId`,
      accessToken,
      accountId,
      { AccountId: accountId, CampaignType: "Search Shopping" }
    );

    const campaigns = (data.Campaigns as Array<Record<string, unknown>>) ?? [];

    return campaigns.map((c) => ({
      campaignId: String(c.Id ?? ""),
      campaignName: String(c.Name ?? ""),
      status: String(c.Status ?? ""),
      budget: Number(c.DailyBudget ?? 0) * 30,
      spend: 0,
      impressions: 0,
      clicks: 0,
      ctr: 0,
      cpc: 0,
      conversions: 0,
      revenue: 0,
      roas: 0,
    }));
  } catch {
    return [];
  }
}

export async function getMicrosoftAdsCampaigns(
  accountId: string,
  startDate: string,
  endDate: string
): Promise<MicrosoftAdsCampaign[]> {
  const accessToken = await getAccessToken();
  return getCampaignsRaw(accessToken, accountId, startDate, endDate);
}

export async function getMicrosoftAdsDailyData(
  accountId: string,
  startDate: string,
  endDate: string
): Promise<MicrosoftAdsDailyData[]> {
  const accessToken = await getAccessToken();

  const reportRequest = {
    ReportRequest: {
      ExcludeColumnHeaders: false,
      ExcludeReportFooter: true,
      ExcludeReportHeader: true,
      Format: "Json",
      ReturnOnlyCompleteData: false,
      Type: "AccountPerformanceReportRequest",
      Aggregation: "Daily",
      Columns: ["TimePeriod", "Spend", "Impressions", "Clicks", "Conversions", "Revenue"],
      Time: {
        CustomDateRangeStart: {
          Day: parseInt(startDate.split("-")[2]),
          Month: parseInt(startDate.split("-")[1]),
          Year: parseInt(startDate.split("-")[0]),
        },
        CustomDateRangeEnd: {
          Day: parseInt(endDate.split("-")[2]),
          Month: parseInt(endDate.split("-")[1]),
          Year: parseInt(endDate.split("-")[0]),
        },
      },
    },
  };

  // Step 1: submit the report
  let reportRequestId: string;
  try {
    const submitData = await msAdsFetch(
      `${MS_ADS_API_BASE}/SubmitGenerateReport`,
      accessToken,
      accountId,
      reportRequest
    );
    reportRequestId = String(submitData.ReportRequestId ?? "");
    if (!reportRequestId) return [];
  } catch {
    return [];
  }

  // Step 2: poll until ready (max 10 attempts × 3s = 30s)
  let downloadUrl = "";
  for (let attempt = 0; attempt < 10; attempt++) {
    await new Promise((r) => setTimeout(r, 3000));
    try {
      const pollData = await msAdsFetch(
        `${MS_ADS_API_BASE}/PollGenerateReport?ReportRequestId=${encodeURIComponent(reportRequestId)}`,
        accessToken,
        accountId
      );
      const status = (pollData.ReportRequestStatus as Record<string, unknown>)?.Status as string | undefined;
      if (status === "Success") {
        downloadUrl = String((pollData.ReportRequestStatus as Record<string, unknown>)?.ReportDownloadUrl ?? "");
        break;
      }
      if (status === "Error" || status === "Failed") return [];
    } catch {
      return [];
    }
  }

  if (!downloadUrl) return [];

  // Step 3: download and parse the JSON report
  try {
    const downloadRes = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!downloadRes.ok) return [];

    const reportJson = await downloadRes.json() as {
      ReportData?: {
        Rows?: Array<{
          TimePeriod?: string;
          Spend?: number | string;
          Impressions?: number | string;
          Clicks?: number | string;
          Conversions?: number | string;
          Revenue?: number | string;
        }>;
      };
    };

    const rows = reportJson.ReportData?.Rows ?? [];
    return rows
      .map((row) => ({
        date: String(row.TimePeriod ?? "").split("T")[0],
        spend: Number(row.Spend ?? 0),
        impressions: Number(row.Impressions ?? 0),
        clicks: Number(row.Clicks ?? 0),
        conversions: Number(row.Conversions ?? 0),
        revenue: Number(row.Revenue ?? 0),
      }))
      .filter((r) => r.date)
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}
