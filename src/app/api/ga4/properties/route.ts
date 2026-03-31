import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getGoogleAccessToken } from "@/lib/google-auth";

export interface GA4Property {
  id: string;
  displayName: string;
  account: string;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.GA4_CLIENT_EMAIL) {
      return NextResponse.json(
        { error: "GA4 service account not configured" },
        { status: 503 }
      );
    }

    const token = await getGoogleAccessToken();

    const properties: GA4Property[] = [];
    let pageToken: string | undefined;

    do {
      const url = new URL("https://analyticsadmin.googleapis.com/v1beta/accountSummaries");
      url.searchParams.set("pageSize", "200");
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`GA4 Admin API error: ${err}`);
      }

      const data = await response.json();

      for (const account of data.accountSummaries ?? []) {
        for (const prop of account.propertySummaries ?? []) {
          properties.push({
            id: prop.property.replace("properties/", ""),
            displayName: prop.displayName,
            account: account.displayName,
          });
        }
      }

      pageToken = data.nextPageToken;
    } while (pageToken);

    return NextResponse.json(properties);
  } catch (error) {
    console.error("GA4 properties error:", error);
    const message = error instanceof Error ? error.message : "Failed to list GA4 properties";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
