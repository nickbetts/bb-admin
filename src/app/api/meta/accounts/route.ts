import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMetaAccessToken } from "@/lib/meta-token";

export interface MetaAdAccount {
  id: string;
  name: string;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = await getMetaAccessToken();
    if (!token) {
      return NextResponse.json({ error: "META_ACCESS_TOKEN not configured" }, { status: 503 });
    }

    const params = new URLSearchParams({
      access_token: token,
      fields: "id,name,account_status",
      limit: "100",
    });

    const response = await fetch(`https://graph.facebook.com/v19.0/me/adaccounts?${params}`);

    if (!response.ok) {
      let message = "Meta API error";
      try {
        const errData = await response.json();
        message = errData.error?.message ?? message;
      } catch {
        message = await response.text();
      }
      throw new Error(message);
    }

    const data = await response.json();

    const accounts: MetaAdAccount[] = (data.data ?? []).map((a: { id: string; name: string }) => ({
      id: a.id.replace("act_", ""),
      name: a.name,
    }));

    return NextResponse.json(accounts);
  } catch (error) {
    console.error("Meta accounts error:", error);
    const message = error instanceof Error ? error.message : "Failed to list Meta ad accounts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
