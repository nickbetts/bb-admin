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
