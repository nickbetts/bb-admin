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
  endDate: string
): Promise<GSCQuery[]> {
  const res = await gscPost(siteUrl, {
    startDate,
    endDate,
    dimensions: ["query"],
    rowLimit: 20,
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
