// Google Search Console integration using Search Console API (service account)
import { GoogleAuth } from "google-auth-library";

let _gscAuth: GoogleAuth | null = null;

function getGscAuth(): GoogleAuth {
  if (!_gscAuth) {
    const clientEmail = process.env.GA4_CLIENT_EMAIL;
    const privateKey = process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (!clientEmail || !privateKey) {
      throw new Error("GA4_CLIENT_EMAIL and GA4_PRIVATE_KEY must be set in environment variables");
    }
    _gscAuth = new GoogleAuth({
      credentials: { client_email: clientEmail, private_key: privateKey },
      scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
    });
  }
  return _gscAuth;
}

async function getGscAccessToken(): Promise<string> {
  const client = await getGscAuth().getClient();
  const tokenResponse = await client.getAccessToken();
  if (!tokenResponse.token) {
    throw new Error("Failed to obtain Google access token for Search Console");
  }
  return tokenResponse.token;
}

async function gscPost(siteUrl: string, body: object): Promise<Response> {
  const token = await getGscAccessToken();
  const encodedSite = encodeURIComponent(siteUrl);
  return fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    }
  );
}

export interface GSCOverview {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCPage {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCDailyData {
  date: string;
  clicks: number;
  impressions: number;
}

export interface GSCSite {
  siteUrl: string;
  permissionLevel: string;
}

export async function getGSCSites(): Promise<GSCSite[]> {
  const token = await getGscAccessToken();
  const res = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Search Console sites error: ${err}`);
  }
  const data = await res.json();
  return (data.siteEntry ?? []) as GSCSite[];
}

export async function getGSCOverview(
  siteUrl: string,
  startDate: string,
  endDate: string
): Promise<GSCOverview> {
  const res = await gscPost(siteUrl, {
    startDate,
    endDate,
    rowLimit: 1,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Search Console API error: ${err}`);
  }
  const data = await res.json();
  const row = data.rows?.[0];
  return {
    clicks: row?.clicks ?? 0,
    impressions: row?.impressions ?? 0,
    ctr: row?.ctr ?? 0,
    position: row?.position ?? 0,
  };
}

export async function getGSCTopQueries(
  siteUrl: string,
  startDate: string,
  endDate: string,
  rowLimit: number = 20
): Promise<GSCQuery[]> {
  const res = await gscPost(siteUrl, {
    startDate,
    endDate,
    dimensions: ["query"],
    rowLimit,
    orderBy: [{ fieldName: "clicks", sortOrder: "DESCENDING" }],
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Search Console API error: ${err}`);
  }
  const data = await res.json();
  return (data.rows ?? []).map((row: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }) => ({
    query: row.keys[0],
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  }));
}

export async function getGSCTopPages(
  siteUrl: string,
  startDate: string,
  endDate: string
): Promise<GSCPage[]> {
  const res = await gscPost(siteUrl, {
    startDate,
    endDate,
    dimensions: ["page"],
    rowLimit: 20,
    orderBy: [{ fieldName: "clicks", sortOrder: "DESCENDING" }],
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Search Console API error: ${err}`);
  }
  const data = await res.json();
  return (data.rows ?? []).map((row: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }) => ({
    page: row.keys[0],
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  }));
}

export async function getGSCDailyData(
  siteUrl: string,
  startDate: string,
  endDate: string
): Promise<GSCDailyData[]> {
  const res = await gscPost(siteUrl, {
    startDate,
    endDate,
    dimensions: ["date"],
    rowLimit: 500,
    orderBy: [{ fieldName: "date", sortOrder: "ASCENDING" }],
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Search Console API error: ${err}`);
  }
  const data = await res.json();
  return (data.rows ?? []).map((row: { keys: string[]; clicks: number; impressions: number }) => ({
    date: row.keys[0],
    clicks: row.clicks,
    impressions: row.impressions,
  }));
}

export interface GSCDevice {
  device: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCCountry {
  country: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export async function getGSCDevices(
  siteUrl: string,
  startDate: string,
  endDate: string
): Promise<GSCDevice[]> {
  const res = await gscPost(siteUrl, {
    startDate,
    endDate,
    dimensions: ["device"],
    rowLimit: 10,
    orderBy: [{ fieldName: "clicks", sortOrder: "DESCENDING" }],
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Search Console API error: ${err}`);
  }
  const data = await res.json();
  return (data.rows ?? []).map((row: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }) => ({
    device: row.keys[0],
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  }));
}

export async function getGSCCountries(
  siteUrl: string,
  startDate: string,
  endDate: string
): Promise<GSCCountry[]> {
  const res = await gscPost(siteUrl, {
    startDate,
    endDate,
    dimensions: ["country"],
    rowLimit: 15,
    orderBy: [{ fieldName: "clicks", sortOrder: "DESCENDING" }],
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Search Console API error: ${err}`);
  }
  const data = await res.json();
  return (data.rows ?? []).map((row: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }) => ({
    country: row.keys[0],
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  }));
}

// --- Branded vs Non-Branded Split ---

export interface GSCBrandedSplit {
  branded: { clicks: number; impressions: number; ctr: number; position: number };
  nonBranded: { clicks: number; impressions: number; ctr: number; position: number };
  topBrandedQueries: GSCQuery[];
  topNonBrandedQueries: GSCQuery[];
}

export async function getGSCBrandedSplit(
  siteUrl: string,
  startDate: string,
  endDate: string,
  brandTerms: string[] = []
): Promise<GSCBrandedSplit> {
  const emptyMetrics = { clicks: 0, impressions: 0, ctr: 0, position: 0 };

  const res = await gscPost(siteUrl, {
    startDate,
    endDate,
    dimensions: ["query"],
    rowLimit: 500,
    orderBy: [{ fieldName: "clicks", sortOrder: "DESCENDING" }],
  });

  if (!res.ok) {
    return { branded: emptyMetrics, nonBranded: emptyMetrics, topBrandedQueries: [], topNonBrandedQueries: [] };
  }

  const data = await res.json();
  const allQueries: GSCQuery[] = (data.rows ?? []).map(
    (row: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }) => ({
      query: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    })
  );

  const lowerBrands = brandTerms.map((t) => t.toLowerCase());
  const isBranded = (q: string) => lowerBrands.some((b) => q.toLowerCase().includes(b));

  const branded = allQueries.filter((q) => isBranded(q.query));
  const nonBranded = allQueries.filter((q) => !isBranded(q.query));

  const aggregate = (queries: GSCQuery[]) => {
    const totalClicks = queries.reduce((s, q) => s + q.clicks, 0);
    const totalImpressions = queries.reduce((s, q) => s + q.impressions, 0);
    return {
      clicks: totalClicks,
      impressions: totalImpressions,
      ctr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
      position: queries.length > 0 ? queries.reduce((s, q) => s + q.position, 0) / queries.length : 0,
    };
  };

  return {
    branded: aggregate(branded),
    nonBranded: aggregate(nonBranded),
    topBrandedQueries: branded.slice(0, 20),
    topNonBrandedQueries: nonBranded.slice(0, 20),
  };
}

// --- URL Inspection API ---

export interface GSCUrlInspection {
  url: string;
  indexingState: string;
  coverageState: string;
  robotsTxtState: string;
  lastCrawlTime: string | null;
  pageFetchState: string;
  crawledAs: string;
  verdict: string;
}

export async function getGSCUrlInspection(
  siteUrl: string,
  urls: string[]
): Promise<GSCUrlInspection[]> {
  const token = await getGscAccessToken();
  const results: GSCUrlInspection[] = [];

  for (const inspectionUrl of urls.slice(0, 20)) {
    try {
      const res = await fetch(
        "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ inspectionUrl, siteUrl }),
          cache: "no-store",
        }
      );

      if (!res.ok) continue;

      const data = await res.json();
      const result = data.inspectionResult?.indexStatusResult ?? {};
      results.push({
        url: inspectionUrl,
        indexingState: result.indexingState ?? "UNKNOWN",
        coverageState: result.coverageState ?? "UNKNOWN",
        robotsTxtState: result.robotsTxtState ?? "UNKNOWN",
        lastCrawlTime: result.lastCrawlTime ?? null,
        pageFetchState: result.pageFetchState ?? "UNKNOWN",
        crawledAs: result.crawledAs ?? "UNKNOWN",
        verdict: result.verdict ?? "UNKNOWN",
      });
    } catch {
      // Skip individual URL errors
    }
  }

  return results;
}
