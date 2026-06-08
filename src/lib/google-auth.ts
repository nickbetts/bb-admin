import { GoogleAuth } from "google-auth-library";
import { prisma } from "@/lib/prisma";

let _auth: GoogleAuth | null = null;

export function hasGoogleServiceAccountCredentials(): boolean {
  return Boolean(process.env.GA4_CLIENT_EMAIL && process.env.GA4_PRIVATE_KEY);
}

function getAuth(): GoogleAuth {
  if (!_auth) {
    const clientEmail = process.env.GA4_CLIENT_EMAIL;
    const privateKey = process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (!clientEmail || !privateKey) {
      throw new Error("GA4_CLIENT_EMAIL and GA4_PRIVATE_KEY must be set in environment variables");
    }
    _auth = new GoogleAuth({
      credentials: { client_email: clientEmail, private_key: privateKey },
      scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
    });
  }
  return _auth;
}

export async function getGoogleAccessToken(): Promise<string> {
  const client = await getAuth().getClient();
  const tokenResponse = await client.getAccessToken();
  if (!tokenResponse.token) {
    throw new Error("Failed to obtain Google access token from service account");
  }
  return tokenResponse.token;
}

export async function getGoogleUserAccessToken(
  preferredEmail?: string,
): Promise<{ token: string; email: string }> {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth client credentials are not configured");
  }

  const connections = await prisma.googleConnection.findMany({
    select: { email: true, refreshToken: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  const normalisedPreferred = preferredEmail?.trim().toLowerCase();
  const orderedConnections = normalisedPreferred
    ? [
        ...connections.filter((c) => c.email.trim().toLowerCase() === normalisedPreferred),
        ...connections.filter((c) => c.email.trim().toLowerCase() !== normalisedPreferred),
      ]
    : connections;

  for (const connection of orderedConnections) {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: connection.refreshToken,
        grant_type: "refresh_token",
      }),
      cache: "no-store",
    });

    if (!tokenRes.ok) continue;
    const tokenData = (await tokenRes.json()) as { access_token?: string };
    if (tokenData.access_token) {
      return { token: tokenData.access_token, email: connection.email };
    }
  }

  throw new Error("No usable Google OAuth connection found. Reconnect Google in Settings.");
}
