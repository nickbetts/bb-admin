// GA4 integration using Google Analytics Data API (service account — non-expiring)
import { getGoogleAccessToken } from "@/lib/google-auth";

async function buildGa4Headers(): Promise<Record<string, string>> {
  const token = await getGoogleAccessToken();
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export interface GA4MetricsData {
  sessions: number;
  users: number;
  newUsers: number;
  pageviews: number;
  bounceRate: number;
  avgSessionDuration: number;
  conversionRate: number;
  engagedSessions: number;
  engagementRate: number;
}

export interface GA4TrafficSource {
  source: string;
  medium: string;
  sessions: number;
  users: number;
  bounceRate: number;
  conversions: number;
}

export interface GA4DailyData {
  date: string;
  sessions: number;
  users: number;
  pageviews: number;
}

export interface GA4TopPage {
  pagePath: string;
  pageTitle: string;
  sessions: number;
  pageviews: number;
  bounceRate: number;
}

export async function getGA4Overview(
  propertyId: string,
  startDate: string = "30daysAgo",
  endDate: string = "today"
): Promise<GA4MetricsData> {
  const headers = await buildGa4Headers();
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

  const body = {
    dateRanges: [{ startDate, endDate }],
    metrics: [
      { name: "sessions" },
      { name: "activeUsers" },
      { name: "newUsers" },
      { name: "screenPageViews" },
      { name: "bounceRate" },
      { name: "averageSessionDuration" },
      { name: "conversions" },
      { name: "engagedSessions" },
      { name: "engagementRate" },
    ],
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`GA4 API error: ${err}`);
  }

  const data = await response.json();
  const row = data.rows?.[0];
  const values = row?.metricValues ?? [];

  const sessions = parseInt(values[0]?.value ?? "0");
  const conversions = parseInt(values[6]?.value ?? "0");

  return {
    sessions,
    users: parseInt(values[1]?.value ?? "0"),
    newUsers: parseInt(values[2]?.value ?? "0"),
    pageviews: parseInt(values[3]?.value ?? "0"),
    bounceRate: parseFloat(values[4]?.value ?? "0") * 100,
    avgSessionDuration: parseFloat(values[5]?.value ?? "0"),
    conversionRate: sessions > 0 ? (conversions / sessions) * 100 : 0,
    engagedSessions: parseInt(values[7]?.value ?? "0"),
    engagementRate: parseFloat(values[8]?.value ?? "0") * 100,
  };
}

export async function getGA4DailyData(
  propertyId: string,
  startDate: string = "30daysAgo",
  endDate: string = "today"
): Promise<GA4DailyData[]> {
  const headers = await buildGa4Headers();
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

  const body = {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "date" }],
    metrics: [
      { name: "sessions" },
      { name: "activeUsers" },
      { name: "screenPageViews" },
    ],
    orderBys: [{ dimension: { dimensionName: "date" } }],
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`GA4 API error: ${err}`);
  }

  const data = await response.json();

  return (data.rows ?? []).map(
    (row: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => {
      const dateStr = row.dimensionValues[0].value;
      const formatted = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
      return {
        date: formatted,
        sessions: parseInt(row.metricValues[0]?.value ?? "0"),
        users: parseInt(row.metricValues[1]?.value ?? "0"),
        pageviews: parseInt(row.metricValues[2]?.value ?? "0"),
      };
    }
  );
}

export async function getGA4TrafficSources(
  propertyId: string,
  startDate: string = "30daysAgo",
  endDate: string = "today"
): Promise<GA4TrafficSource[]> {
  const headers = await buildGa4Headers();
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

  const body = {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
    metrics: [{ name: "sessions" }, { name: "activeUsers" }, { name: "bounceRate" }, { name: "conversions" }],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 10,
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`GA4 API error: ${err}`);
  }

  const data = await response.json();

  return (data.rows ?? []).map(
    (row: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => ({
      source: row.dimensionValues[0]?.value ?? "",
      medium: row.dimensionValues[1]?.value ?? "",
      sessions: parseInt(row.metricValues[0]?.value ?? "0"),
      users: parseInt(row.metricValues[1]?.value ?? "0"),
      bounceRate: parseFloat(row.metricValues[2]?.value ?? "0"),
      conversions: parseInt(row.metricValues[3]?.value ?? "0"),
    })
  );
}

export async function getGA4TopPages(
  propertyId: string,
  startDate: string = "30daysAgo",
  endDate: string = "today"
): Promise<GA4TopPage[]> {
  const headers = await buildGa4Headers();
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

  const body = {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
    metrics: [
      { name: "sessions" },
      { name: "screenPageViews" },
      { name: "bounceRate" },
    ],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 10,
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`GA4 API error: ${err}`);
  }

  const data = await response.json();

  return (data.rows ?? []).map(
    (row: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => ({
      pagePath: row.dimensionValues[0]?.value ?? "",
      pageTitle: row.dimensionValues[1]?.value ?? "",
      sessions: parseInt(row.metricValues[0]?.value ?? "0"),
      pageviews: parseInt(row.metricValues[1]?.value ?? "0"),
      bounceRate: parseFloat(row.metricValues[2]?.value ?? "0") * 100,
    })
  );
}

export interface GA4Country {
  country: string;
  sessions: number;
  users: number;
}

export interface GA4Device {
  device: string;
  sessions: number;
  users: number;
}

export async function getGA4Geography(
  propertyId: string,
  startDate: string = "30daysAgo",
  endDate: string = "today"
): Promise<GA4Country[]> {
  const headers = await buildGa4Headers();
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

  const body = {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "country" }],
    metrics: [{ name: "sessions" }, { name: "activeUsers" }],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 15,
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`GA4 API error: ${err}`);
  }

  const data = await response.json();
  return (data.rows ?? []).map(
    (row: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => ({
      country: row.dimensionValues[0]?.value ?? "",
      sessions: parseInt(row.metricValues[0]?.value ?? "0"),
      users: parseInt(row.metricValues[1]?.value ?? "0"),
    })
  );
}

export async function getGA4Devices(
  propertyId: string,
  startDate: string = "30daysAgo",
  endDate: string = "today"
): Promise<GA4Device[]> {
  const headers = await buildGa4Headers();
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

  const body = {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "deviceCategory" }],
    metrics: [{ name: "sessions" }, { name: "activeUsers" }],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`GA4 API error: ${err}`);
  }

  const data = await response.json();
  return (data.rows ?? []).map(
    (row: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => ({
      device: row.dimensionValues[0]?.value ?? "",
      sessions: parseInt(row.metricValues[0]?.value ?? "0"),
      users: parseInt(row.metricValues[1]?.value ?? "0"),
    })
  );
}

// Organic-only overview (sessionDefaultChannelGroup == "Organic Search")
export async function getGA4OrganicOverview(
  propertyId: string,
  startDate: string = "30daysAgo",
  endDate: string = "today"
): Promise<GA4MetricsData> {
  const headers = await buildGa4Headers();
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

  const body = {
    dateRanges: [{ startDate, endDate }],
    metrics: [
      { name: "sessions" },
      { name: "activeUsers" },
      { name: "newUsers" },
      { name: "screenPageViews" },
      { name: "bounceRate" },
      { name: "averageSessionDuration" },
      { name: "conversions" },
      { name: "engagedSessions" },
      { name: "engagementRate" },
    ],
    dimensionFilter: {
      filter: {
        fieldName: "sessionDefaultChannelGroup",
        stringFilter: { matchType: "EXACT", value: "Organic Search" },
      },
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`GA4 API error: ${err}`);
  }

  const data = await response.json();
  const row = data.rows?.[0];
  const values = row?.metricValues ?? [];

  const sessions = parseInt(values[0]?.value ?? "0");
  const conversions = parseInt(values[6]?.value ?? "0");

  return {
    sessions,
    users: parseInt(values[1]?.value ?? "0"),
    newUsers: parseInt(values[2]?.value ?? "0"),
    pageviews: parseInt(values[3]?.value ?? "0"),
    bounceRate: parseFloat(values[4]?.value ?? "0") * 100,
    avgSessionDuration: parseFloat(values[5]?.value ?? "0"),
    conversionRate: sessions > 0 ? (conversions / sessions) * 100 : 0,
    engagedSessions: parseInt(values[7]?.value ?? "0"),
    engagementRate: parseFloat(values[8]?.value ?? "0") * 100,
  };
}

// New vs Returning
export interface GA4NewVsReturning {
  newUsers: number;
  returningUsers: number;
}

export async function getGA4NewVsReturning(
  propertyId: string,
  startDate: string = "30daysAgo",
  endDate: string = "today"
): Promise<GA4NewVsReturning> {
  const headers = await buildGa4Headers();
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

  const body = {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "newVsReturning" }],
    metrics: [{ name: "activeUsers" }],
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`GA4 API error: ${err}`);
  }

  const data = await response.json();
  let newUsers = 0;
  let returningUsers = 0;
  for (const row of data.rows ?? []) {
    const label = row.dimensionValues[0]?.value ?? "";
    const count = parseInt(row.metricValues[0]?.value ?? "0");
    if (label === "new") newUsers = count;
    else if (label === "returning") returningUsers = count;
  }
  return { newUsers, returningUsers };
}

// Demographics: age + gender
export interface GA4Demographics {
  ageGroups: { range: string; users: number }[];
  genderSplit: { gender: string; users: number }[];
}

export async function getGA4Demographics(
  propertyId: string,
  startDate: string = "30daysAgo",
  endDate: string = "today"
): Promise<GA4Demographics> {
  const headers = await buildGa4Headers();
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

  const [ageRes, genderRes] = await Promise.allSettled([
    fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "userAgeBracket" }],
        metrics: [{ name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
      }),
      cache: "no-store",
    }),
    fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "userGender" }],
        metrics: [{ name: "activeUsers" }],
      }),
      cache: "no-store",
    }),
  ]);

  const ageGroups: { range: string; users: number }[] = [];
  const genderSplit: { gender: string; users: number }[] = [];

  if (ageRes.status === "fulfilled" && ageRes.value.ok) {
    const d = await ageRes.value.json();
    for (const row of d.rows ?? []) {
      ageGroups.push({
        range: row.dimensionValues[0]?.value ?? "",
        users: parseInt(row.metricValues[0]?.value ?? "0"),
      });
    }
  }

  if (genderRes.status === "fulfilled" && genderRes.value.ok) {
    const d = await genderRes.value.json();
    for (const row of d.rows ?? []) {
      genderSplit.push({
        gender: row.dimensionValues[0]?.value ?? "",
        users: parseInt(row.metricValues[0]?.value ?? "0"),
      });
    }
  }

  return { ageGroups, genderSplit };
}

// Conversion events
export interface GA4ConversionEvent {
  eventName: string;
  conversions: number;
}

export async function getGA4ConversionEvents(
  propertyId: string,
  startDate: string = "30daysAgo",
  endDate: string = "today"
): Promise<GA4ConversionEvent[]> {
  const headers = await buildGa4Headers();
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

  const body = {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "eventName" }],
    metrics: [{ name: "conversions" }],
    orderBys: [{ metric: { metricName: "conversions" }, desc: true }],
    dimensionFilter: {
      filter: {
        fieldName: "isConversionEvent",
        stringFilter: { matchType: "EXACT", value: "true" },
      },
    },
    limit: 20,
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) return [];

  const data = await response.json();
  return (data.rows ?? [])
    .map((row: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => ({
      eventName: row.dimensionValues[0]?.value ?? "",
      conversions: parseInt(row.metricValues[0]?.value ?? "0"),
    }))
    .filter((e: GA4ConversionEvent) => e.conversions > 0);
}

// Conversions by channel
export interface GA4ConversionByChannel {
  channel: string;
  conversions: number;
  sessions: number;
}

export async function getGA4ConversionsByChannel(
  propertyId: string,
  startDate: string = "30daysAgo",
  endDate: string = "today"
): Promise<GA4ConversionByChannel[]> {
  const headers = await buildGa4Headers();
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

  const body = {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "sessionDefaultChannelGroup" }],
    metrics: [{ name: "conversions" }, { name: "sessions" }],
    orderBys: [{ metric: { metricName: "conversions" }, desc: true }],
    limit: 10,
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) return [];

  const data = await response.json();
  return (data.rows ?? [])
    .map((row: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => ({
      channel: row.dimensionValues[0]?.value ?? "",
      conversions: parseInt(row.metricValues[0]?.value ?? "0"),
      sessions: parseInt(row.metricValues[1]?.value ?? "0"),
    }))
    .filter((e: GA4ConversionByChannel) => e.conversions > 0);
}

// AI referral sources
export interface GA4AIReferral {
  source: string;
  sessions: number;
  users: number;
}

const AI_SOURCE_REGEXP =
  "chatgpt\\.com|chat\\.openai\\.com|claude\\.ai|perplexity\\.ai|gemini\\.google\\.com|copilot\\.microsoft\\.com|phind\\.com|you\\.com|poe\\.com|grok\\.x\\.com|bing\\.com";

export async function getGA4AIReferrals(
  propertyId: string,
  startDate: string = "30daysAgo",
  endDate: string = "today"
): Promise<GA4AIReferral[]> {
  const headers = await buildGa4Headers();
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

  const body = {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "sessionSource" }],
    metrics: [{ name: "sessions" }, { name: "activeUsers" }],
    dimensionFilter: {
      filter: {
        fieldName: "sessionSource",
        stringFilter: {
          matchType: "FULL_REGEXP",
          value: AI_SOURCE_REGEXP,
          caseSensitive: false,
        },
      },
    },
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 20,
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) return [];

  const data = await response.json();
  return (data.rows ?? []).map(
    (row: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => ({
      source: row.dimensionValues[0]?.value ?? "",
      sessions: parseInt(row.metricValues[0]?.value ?? "0"),
      users: parseInt(row.metricValues[1]?.value ?? "0"),
    })
  );
}

// Landing page performance
export interface GA4LandingPage {
  landingPage: string;
  sessions: number;
  users: number;
  bounceRate: number;
  avgSessionDuration: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
}

export async function getGA4LandingPagePerformance(
  propertyId: string,
  startDate: string = "30daysAgo",
  endDate: string = "today"
): Promise<GA4LandingPage[]> {
  const headers = await buildGa4Headers();
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

  const body = {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "landingPage" }],
    metrics: [
      { name: "sessions" },
      { name: "activeUsers" },
      { name: "bounceRate" },
      { name: "averageSessionDuration" },
      { name: "conversions" },
      { name: "totalRevenue" },
    ],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 30,
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) return [];

  const data = await response.json();
  return (data.rows ?? []).map(
    (row: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => {
      const sessions = parseInt(row.metricValues[0]?.value ?? "0");
      const conversions = parseInt(row.metricValues[4]?.value ?? "0");
      return {
        landingPage: row.dimensionValues[0]?.value ?? "",
        sessions,
        users: parseInt(row.metricValues[1]?.value ?? "0"),
        bounceRate: parseFloat(row.metricValues[2]?.value ?? "0") * 100,
        avgSessionDuration: parseFloat(row.metricValues[3]?.value ?? "0"),
        conversions,
        conversionRate: sessions > 0 ? (conversions / sessions) * 100 : 0,
        revenue: parseFloat(row.metricValues[5]?.value ?? "0"),
      };
    }
  );
}

// User journey / path exploration
export interface GA4UserJourney {
  pagePath: string;
  pageTitle: string;
  entrances: number;
  exits: number;
  avgTimeOnPage: number;
  pageviews: number;
}

export interface GA4UserJourneyResult {
  pages: GA4UserJourney[];
  topEntryPages: { pagePath: string; entrances: number }[];
  topExitPages: { pagePath: string; exits: number }[];
}

export async function getGA4UserJourneys(
  propertyId: string,
  startDate: string = "30daysAgo",
  endDate: string = "today"
): Promise<GA4UserJourneyResult> {
  const headers = await buildGa4Headers();
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

  const body = {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
    metrics: [
      { name: "entrances" },
      { name: "exits" },
      { name: "userEngagementDuration" },
      { name: "screenPageViews" },
    ],
    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    limit: 50,
  };

  const fallback: GA4UserJourneyResult = { pages: [], topEntryPages: [], topExitPages: [] };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) return fallback;

  const data = await response.json();
  const pages: GA4UserJourney[] = (data.rows ?? []).map(
    (row: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => ({
      pagePath: row.dimensionValues[0]?.value ?? "",
      pageTitle: row.dimensionValues[1]?.value ?? "",
      entrances: parseInt(row.metricValues[0]?.value ?? "0"),
      exits: parseInt(row.metricValues[1]?.value ?? "0"),
      avgTimeOnPage: parseFloat(row.metricValues[2]?.value ?? "0"),
      pageviews: parseInt(row.metricValues[3]?.value ?? "0"),
    })
  );

  const topEntryPages = [...pages]
    .sort((a, b) => b.entrances - a.entrances)
    .slice(0, 10)
    .map(({ pagePath, entrances }) => ({ pagePath, entrances }));

  const topExitPages = [...pages]
    .sort((a, b) => b.exits - a.exits)
    .slice(0, 10)
    .map(({ pagePath, exits }) => ({ pagePath, exits }));

  return { pages, topEntryPages, topExitPages };
}

// Cohort retention analysis
export interface GA4CohortRetention {
  cohortActiveUsers: number;
  retentionRates: { week: number; rate: number }[];
}

export async function getGA4CohortRetention(
  propertyId: string,
  startDate: string = "30daysAgo",
  endDate: string = "today"
): Promise<GA4CohortRetention> {
  const headers = await buildGa4Headers();
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

  const body = {
    cohortSpec: {
      cohorts: [
        {
          dimension: "firstSessionDate",
          dateRange: { startDate, endDate },
        },
      ],
      cohortsRange: {
        granularity: "WEEKLY",
        endOffset: 5,
      },
    },
    metrics: [{ name: "cohortActiveUsers" }, { name: "cohortTotalUsers" }],
    dimensions: [{ name: "cohort" }, { name: "cohortNthWeek" }],
  };

  const fallback: GA4CohortRetention = { cohortActiveUsers: 0, retentionRates: [] };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) return fallback;

  const data = await response.json();
  const rows = data.rows ?? [];

  if (rows.length === 0) return fallback;

  let totalCohortUsers = 0;
  const weekMap = new Map<number, { active: number; total: number }>();

  for (const row of rows as { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[]) {
    const week = parseInt(row.dimensionValues[1]?.value ?? "0");
    const active = parseInt(row.metricValues[0]?.value ?? "0");
    const total = parseInt(row.metricValues[1]?.value ?? "0");

    if (week === 0) totalCohortUsers += active;

    const existing = weekMap.get(week) ?? { active: 0, total: 0 };
    weekMap.set(week, {
      active: existing.active + active,
      total: existing.total + total,
    });
  }

  const retentionRates = Array.from(weekMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([week, { active, total }]) => ({
      week,
      rate: total > 0 ? Math.round((active / total) * 10000) / 100 : 0,
    }));

  return { cohortActiveUsers: totalCohortUsers, retentionRates };
}

// --- Wave 7: Session duration distribution (#63) ---
export interface GA4SessionDurationBucket {
  bucket: string;
  sessions: number;
}

export async function getGA4SessionDurationDistribution(
  propertyId: string,
  startDate: string = "30daysAgo",
  endDate: string = "today"
): Promise<GA4SessionDurationBucket[]> {
  const headers = await buildGa4Headers();
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

  // Use sessionDuration as a metric and segment by ranges using the API
  // GA4 doesn't natively bucket durations, so we pull raw data and bucket client-side
  const body = {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "sessionDuration" }],
    metrics: [{ name: "sessions" }],
    orderBys: [{ dimension: { dimensionName: "sessionDuration" } }],
    limit: 10000,
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) return [];

  const data = await response.json();
  const rows = data.rows ?? [];

  const buckets: Record<string, number> = {
    "< 10s": 0,
    "10-30s": 0,
    "30s-1m": 0,
    "1-3m": 0,
    "3-10m": 0,
    "10m+": 0,
  };

  for (const row of rows as { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[]) {
    const durationSec = parseInt(row.dimensionValues[0]?.value ?? "0");
    const sessions = parseInt(row.metricValues[0]?.value ?? "0");

    if (durationSec < 10) buckets["< 10s"] += sessions;
    else if (durationSec < 30) buckets["10-30s"] += sessions;
    else if (durationSec < 60) buckets["30s-1m"] += sessions;
    else if (durationSec < 180) buckets["1-3m"] += sessions;
    else if (durationSec < 600) buckets["3-10m"] += sessions;
    else buckets["10m+"] += sessions;
  }

  return Object.entries(buckets).map(([bucket, sessions]) => ({ bucket, sessions }));
}

// --- Wave 7: Event parameters/values (#64) ---
export interface GA4EventParameter {
  eventName: string;
  eventCount: number;
  eventValue: number;
}

export async function getGA4EventParameters(
  propertyId: string,
  startDate: string = "30daysAgo",
  endDate: string = "today"
): Promise<GA4EventParameter[]> {
  const headers = await buildGa4Headers();
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

  const body = {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "eventName" }],
    metrics: [{ name: "eventCount" }, { name: "eventValue" }],
    orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
    limit: 50,
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) return [];

  const data = await response.json();
  return (data.rows ?? []).map(
    (row: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => ({
      eventName: row.dimensionValues[0]?.value ?? "",
      eventCount: parseInt(row.metricValues[0]?.value ?? "0"),
      eventValue: parseFloat(row.metricValues[1]?.value ?? "0"),
    })
  );
}

// --- Wave 7: Content grouping (#65) ---
export interface GA4ContentGroup {
  contentGroup: string;
  sessions: number;
  pageviews: number;
  bounceRate: number;
  avgSessionDuration: number;
}

export async function getGA4ContentGrouping(
  propertyId: string,
  startDate: string = "30daysAgo",
  endDate: string = "today"
): Promise<GA4ContentGroup[]> {
  const headers = await buildGa4Headers();
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

  const body = {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "contentGroup" }],
    metrics: [
      { name: "sessions" },
      { name: "screenPageViews" },
      { name: "bounceRate" },
      { name: "averageSessionDuration" },
    ],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 20,
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) return [];

  const data = await response.json();
  return (data.rows ?? []).map(
    (row: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => ({
      contentGroup: row.dimensionValues[0]?.value ?? "(not set)",
      sessions: parseInt(row.metricValues[0]?.value ?? "0"),
      pageviews: parseInt(row.metricValues[1]?.value ?? "0"),
      bounceRate: parseFloat(row.metricValues[2]?.value ?? "0"),
      avgSessionDuration: parseFloat(row.metricValues[3]?.value ?? "0"),
    })
  );
}

// --- Wave 7: Real-time API (#66) ---
export interface GA4RealTimeData {
  activeUsers: number;
  bySource: { source: string; activeUsers: number }[];
  byPage: { pagePath: string; activeUsers: number }[];
}

export async function getGA4RealTimeData(
  propertyId: string
): Promise<GA4RealTimeData> {
  const headers = await buildGa4Headers();
  const baseUrl = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`;

  // Fetch active users overall + by source + by page in parallel
  const [totalRes, sourceRes, pageRes] = await Promise.allSettled([
    fetch(baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        metrics: [{ name: "activeUsers" }],
      }),
      cache: "no-store",
    }),
    fetch(baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        dimensions: [{ name: "unifiedScreenName" }],
        metrics: [{ name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
        limit: 10,
      }),
      cache: "no-store",
    }),
    fetch(baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        dimensions: [{ name: "unifiedPagePathScreen" }],
        metrics: [{ name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
        limit: 10,
      }),
      cache: "no-store",
    }),
  ]);

  let activeUsers = 0;
  if (totalRes.status === "fulfilled" && totalRes.value.ok) {
    const d = await totalRes.value.json();
    activeUsers = parseInt(d.rows?.[0]?.metricValues?.[0]?.value ?? "0");
  }

  const bySource: { source: string; activeUsers: number }[] = [];
  if (sourceRes.status === "fulfilled" && sourceRes.value.ok) {
    const d = await sourceRes.value.json();
    for (const row of d.rows ?? []) {
      bySource.push({
        source: row.dimensionValues[0]?.value ?? "",
        activeUsers: parseInt(row.metricValues[0]?.value ?? "0"),
      });
    }
  }

  const byPage: { pagePath: string; activeUsers: number }[] = [];
  if (pageRes.status === "fulfilled" && pageRes.value.ok) {
    const d = await pageRes.value.json();
    for (const row of d.rows ?? []) {
      byPage.push({
        pagePath: row.dimensionValues[0]?.value ?? "",
        activeUsers: parseInt(row.metricValues[0]?.value ?? "0"),
      });
    }
  }

  return { activeUsers, bySource, byPage };
}

// --- Wave 7: Scroll depth (#67) ---
export interface GA4ScrollDepth {
  percentScrolled: string;
  eventCount: number;
  users: number;
}

export async function getGA4ScrollDepth(
  propertyId: string,
  startDate: string = "30daysAgo",
  endDate: string = "today"
): Promise<GA4ScrollDepth[]> {
  const headers = await buildGa4Headers();
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

  const body = {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "percentScrolled" }],
    metrics: [{ name: "eventCount" }, { name: "totalUsers" }],
    dimensionFilter: {
      filter: {
        fieldName: "eventName",
        stringFilter: { matchType: "EXACT", value: "scroll" },
      },
    },
    orderBys: [{ dimension: { dimensionName: "percentScrolled" } }],
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) return [];

  const data = await response.json();
  return (data.rows ?? []).map(
    (row: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => ({
      percentScrolled: row.dimensionValues[0]?.value ?? "",
      eventCount: parseInt(row.metricValues[0]?.value ?? "0"),
      users: parseInt(row.metricValues[1]?.value ?? "0"),
    })
  );
}

// --- Wave 7: Browser/OS breakdown (#68) ---
export interface GA4BrowserOS {
  browser: string;
  operatingSystem: string;
  sessions: number;
  users: number;
}

export async function getGA4BrowserOS(
  propertyId: string,
  startDate: string = "30daysAgo",
  endDate: string = "today"
): Promise<GA4BrowserOS[]> {
  const headers = await buildGa4Headers();
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

  const body = {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "browser" }, { name: "operatingSystem" }],
    metrics: [{ name: "sessions" }, { name: "activeUsers" }],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 25,
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) return [];

  const data = await response.json();
  return (data.rows ?? []).map(
    (row: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => ({
      browser: row.dimensionValues[0]?.value ?? "",
      operatingSystem: row.dimensionValues[1]?.value ?? "",
      sessions: parseInt(row.metricValues[0]?.value ?? "0"),
      users: parseInt(row.metricValues[1]?.value ?? "0"),
    })
  );
}

// --- E-commerce purchase revenue at page/source level ---
export interface GA4EcommerceRevenue {
  pagePath: string;
  source: string;
  medium: string;
  transactions: number;
  purchaseRevenue: number;
  totalRevenue: number;
}

export async function getGA4EcommerceRevenue(
  propertyId: string,
  startDate: string = "30daysAgo",
  endDate: string = "today"
): Promise<GA4EcommerceRevenue[]> {
  const headers = await buildGa4Headers();
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

  const body = {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "pagePath" }, { name: "sessionSource" }, { name: "sessionMedium" }],
    metrics: [
      { name: "ecommercePurchases" },
      { name: "purchaseRevenue" },
      { name: "totalRevenue" },
    ],
    orderBys: [{ metric: { metricName: "purchaseRevenue" }, desc: true }],
    limit: 50,
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) return [];

  const data = await response.json();
  return (data.rows ?? []).map(
    (row: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => ({
      pagePath: row.dimensionValues[0]?.value ?? "",
      source: row.dimensionValues[1]?.value ?? "",
      medium: row.dimensionValues[2]?.value ?? "",
      transactions: parseInt(row.metricValues[0]?.value ?? "0"),
      purchaseRevenue: parseFloat(row.metricValues[1]?.value ?? "0"),
      totalRevenue: parseFloat(row.metricValues[2]?.value ?? "0"),
    })
  );
}

// --- User acquisition vs traffic acquisition (firstUser dimensions) ---
export interface GA4UserAcquisition {
  firstUserSource: string;
  firstUserMedium: string;
  newUsers: number;
  sessions: number;
  engagedSessions: number;
  conversions: number;
}

export async function getGA4UserAcquisition(
  propertyId: string,
  startDate: string = "30daysAgo",
  endDate: string = "today"
): Promise<GA4UserAcquisition[]> {
  const headers = await buildGa4Headers();
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

  const body = {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "firstUserSource" }, { name: "firstUserMedium" }],
    metrics: [
      { name: "newUsers" },
      { name: "sessions" },
      { name: "engagedSessions" },
      { name: "conversions" },
    ],
    orderBys: [{ metric: { metricName: "newUsers" }, desc: true }],
    limit: 25,
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) return [];

  const data = await response.json();
  return (data.rows ?? []).map(
    (row: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => ({
      firstUserSource: row.dimensionValues[0]?.value ?? "",
      firstUserMedium: row.dimensionValues[1]?.value ?? "",
      newUsers: parseInt(row.metricValues[0]?.value ?? "0"),
      sessions: parseInt(row.metricValues[1]?.value ?? "0"),
      engagedSessions: parseInt(row.metricValues[2]?.value ?? "0"),
      conversions: parseInt(row.metricValues[3]?.value ?? "0"),
    })
  );
}

// --- Revenue per session (derived metric) ---
export interface GA4RevenuePerSession {
  source: string;
  medium: string;
  sessions: number;
  totalRevenue: number;
  revenuePerSession: number;
}

export async function getGA4RevenuePerSession(
  propertyId: string,
  startDate: string = "30daysAgo",
  endDate: string = "today"
): Promise<GA4RevenuePerSession[]> {
  const headers = await buildGa4Headers();
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

  const body = {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
    metrics: [{ name: "sessions" }, { name: "totalRevenue" }],
    orderBys: [{ metric: { metricName: "totalRevenue" }, desc: true }],
    limit: 25,
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) return [];

  const data = await response.json();
  return (data.rows ?? []).map(
    (row: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => {
      const sessions = parseInt(row.metricValues[0]?.value ?? "0");
      const totalRevenue = parseFloat(row.metricValues[1]?.value ?? "0");
      return {
        source: row.dimensionValues[0]?.value ?? "",
        medium: row.dimensionValues[1]?.value ?? "",
        sessions,
        totalRevenue,
        revenuePerSession: sessions > 0 ? totalRevenue / sessions : 0,
      };
    }
  );
}
