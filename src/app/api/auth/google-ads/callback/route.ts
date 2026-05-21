import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invalidateApiCache } from "@/lib/api-cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(oauthError)}`, request.url),
    );
  }

  const cookieState = request.cookies.get("gads_oauth_state")?.value;
  if (!code || !state || state !== cookieState) {
    return NextResponse.redirect(new URL("/settings?error=oauth_state_mismatch", request.url));
  }

  const canonicalOrigin = process.env.NEXT_PUBLIC_APP_URL ?? origin;
  const redirectUri = `${canonicalOrigin}/api/auth/google-ads/callback`;

  // Exchange authorisation code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    console.error("Google Ads OAuth token exchange failed:", await tokenRes.text());
    return NextResponse.redirect(new URL("/settings?error=token_exchange_failed", request.url));
  }

  const tokenData = (await tokenRes.json()) as { refresh_token?: string; access_token?: string };
  const { refresh_token, access_token } = tokenData;

  if (!refresh_token) {
    // This can happen if the user had already authorised and revocation wasn't done.
    // We forced consent, so this is unexpected — surface it clearly.
    return NextResponse.redirect(new URL("/settings?error=no_refresh_token", request.url));
  }

  // Fetch the Google account email for display
  let email = "Unknown account";
  if (access_token) {
    try {
      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (userRes.ok) {
        const userInfo = (await userRes.json()) as { email?: string };
        email = userInfo.email ?? email;
      }
    } catch {
      // Non-fatal — continue without email
    }
  }

  // Upsert: update token if this email is already connected, otherwise create
  const existing = await prisma.googleConnection.findFirst({ where: { email } });
  let connectionId = "";
  if (existing) {
    const updated = await prisma.googleConnection.update({
      where: { id: existing.id },
      data: { refreshToken: refresh_token },
    });
    connectionId = updated.id;
  } else {
    const created = await prisma.googleConnection.create({
      data: { label: email, email, refreshToken: refresh_token },
    });
    connectionId = created.id;
  }

  if (connectionId) {
    await invalidateApiCache(`google-connection-status:${connectionId}`);
  }

  const response = NextResponse.redirect(new URL("/settings?connected=1", request.url));
  response.cookies.delete("gads_oauth_state");
  return response;
}
