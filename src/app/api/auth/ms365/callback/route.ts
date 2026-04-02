import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(
      new URL(
        `/admin/settings?error=${encodeURIComponent(oauthError)}`,
        request.url
      )
    );
  }

  const cookieState = request.cookies.get("ms365_oauth_state")?.value;
  if (!code || !state || state !== cookieState) {
    return NextResponse.redirect(
      new URL("/admin/settings?error=oauth_state_mismatch", request.url)
    );
  }

  const redirectUri = `${origin}/api/auth/ms365/callback`;
  const tenantId = process.env.MS365_TENANT_ID ?? "common";

  // Exchange authorisation code for tokens
  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.MS365_CLIENT_ID!,
        client_secret: process.env.MS365_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        scope:
          "https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Calendars.Read https://graph.microsoft.com/User.Read offline_access",
      }),
    }
  );

  if (!tokenRes.ok) {
    console.error(
      "MS365 OAuth token exchange failed:",
      await tokenRes.text()
    );
    return NextResponse.redirect(
      new URL("/admin/settings?error=token_exchange_failed", request.url)
    );
  }

  const tokenData = (await tokenRes.json()) as {
    refresh_token?: string;
    access_token?: string;
  };
  const { refresh_token, access_token } = tokenData;

  if (!refresh_token) {
    return NextResponse.redirect(
      new URL("/admin/settings?error=no_refresh_token", request.url)
    );
  }

  // Fetch the MS365 account email for display
  let email = "unknown@microsoft.com";
  let displayName = "MS365 Account";
  if (access_token) {
    try {
      const meRes = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (meRes.ok) {
        const me = (await meRes.json()) as {
          mail?: string;
          userPrincipalName?: string;
          displayName?: string;
        };
        email = me.mail ?? me.userPrincipalName ?? email;
        displayName = me.displayName ?? displayName;
      }
    } catch {
      // Non-fatal — continue without name
    }
  }

  // Upsert: update token if this email is already connected, otherwise create
  const existing = await (prisma as any).ms365Connection.findFirst({
    where: { email },
  });
  if (existing) {
    await (prisma as any).ms365Connection.update({
      where: { id: existing.id },
      data: { refreshToken: refresh_token, label: displayName },
    });
  } else {
    await (prisma as any).ms365Connection.create({
      data: { label: displayName, email, refreshToken: refresh_token },
    });
  }

  const response = NextResponse.redirect(
    new URL("/admin/settings?ms365_connected=1", request.url)
  );
  response.cookies.delete("ms365_oauth_state");
  return response;
}
