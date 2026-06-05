import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/secret-crypto";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  const returnTo = request.cookies.get("gtm_oauth_return_to")?.value ?? "/tools/tracking-guru";

  if (oauthError) {
    return NextResponse.redirect(
      new URL(`${returnTo}?error=${encodeURIComponent(oauthError)}`, request.url),
    );
  }

  const cookieState = request.cookies.get("gtm_oauth_state")?.value;
  if (!code || !state || state !== cookieState) {
    return NextResponse.redirect(new URL(`${returnTo}?error=oauth_state_mismatch`, request.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL(`${returnTo}?error=google_oauth_not_configured`, request.url),
    );
  }

  const cookieRedirectUri = request.cookies.get("gtm_oauth_redirect_uri")?.value;
  const configuredBase =
    process.env.GOOGLE_OAUTH_REDIRECT_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  const fallbackOrigin = (configuredBase ?? origin).replace(/\/$/, "");
  const redirectUri =
    cookieRedirectUri && /^https?:\/\//.test(cookieRedirectUri)
      ? cookieRedirectUri
      : `${fallbackOrigin}/api/auth/google-gtm/callback`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    console.error("GTM OAuth token exchange failed:", {
      redirectUri,
      error: await tokenRes.text(),
    });
    return NextResponse.redirect(new URL(`${returnTo}?error=token_exchange_failed`, request.url));
  }

  const tokenData = (await tokenRes.json()) as { refresh_token?: string; access_token?: string };
  const accessToken = tokenData.access_token;

  let email = "Unknown account";
  if (accessToken) {
    try {
      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (userRes.ok) {
        const userInfo = (await userRes.json()) as { email?: string };
        email = userInfo.email ?? email;
      }
    } catch {
      // Non-fatal; continue without email enrichment.
    }
  }

  const existing = await prisma.googleTagManagerConnection.findUnique({ where: { email } });
  const refreshToken = tokenData.refresh_token
    ? encryptSecret(tokenData.refresh_token)
    : (existing?.refreshToken ?? "");

  if (!refreshToken) {
    return NextResponse.redirect(new URL(`${returnTo}?error=no_refresh_token`, request.url));
  }

  if (existing) {
    await prisma.googleTagManagerConnection.update({
      where: { id: existing.id },
      data: {
        label: email,
        refreshToken,
      },
    });
  } else {
    await prisma.googleTagManagerConnection.create({
      data: {
        label: email,
        email,
        refreshToken,
      },
    });
  }

  const response = NextResponse.redirect(new URL(`${returnTo}?gtmConnected=1`, request.url));
  response.cookies.delete("gtm_oauth_state");
  response.cookies.delete("gtm_oauth_return_to");
  response.cookies.delete("gtm_oauth_redirect_uri");
  return response;
}
