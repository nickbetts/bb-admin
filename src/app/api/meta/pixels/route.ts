import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { withApiCache, withCacheBypass } from "@/lib/api-cache";
import { getMetaAccessToken } from "@/lib/meta-token";

interface MetaPixelSummary {
  id: string;
  name: string;
  adAccountId: string;
  adAccountName: string;
}

interface GraphPixel {
  id?: string;
  name?: string;
}

interface GraphAccount {
  id?: string;
  name?: string;
  adspixels?: {
    data?: GraphPixel[];
  };
}

interface GraphResponse {
  data?: GraphAccount[];
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return await withCacheBypass(request, async () => {
      const token = await getMetaAccessToken();
      if (!token) {
        return NextResponse.json({ error: "META_ACCESS_TOKEN not configured" }, { status: 503 });
      }

      const pixels = await withApiCache("meta:pixels", 4, async () => {
        const params = new URLSearchParams({
          access_token: token,
          fields: "id,name,adspixels{id,name}",
          limit: "100",
        });

        const response = await fetch(`https://graph.facebook.com/v19.0/me/adaccounts?${params}`);
        if (!response.ok) {
          let message = "Meta API error";
          try {
            const errData = (await response.json()) as { error?: { message?: string } };
            message = errData.error?.message ?? message;
          } catch {
            message = await response.text();
          }
          throw new Error(message);
        }

        const payload = (await response.json()) as GraphResponse;
        const results: MetaPixelSummary[] = [];
        const seen = new Set<string>();

        for (const account of payload.data ?? []) {
          const accountId = account.id?.replace("act_", "") ?? "";
          const accountName = account.name ?? "Unknown account";
          for (const pixel of account.adspixels?.data ?? []) {
            if (!pixel.id || seen.has(pixel.id)) continue;
            seen.add(pixel.id);
            results.push({
              id: pixel.id,
              name: pixel.name ?? `Pixel ${pixel.id}`,
              adAccountId: accountId,
              adAccountName: accountName,
            });
          }
        }

        return results;
      });

      return NextResponse.json(pixels);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list Meta pixels";
    console.error("Meta pixels error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
