// One-time script to generate a Google Ads OAuth2 refresh token.
// Run: node scripts/get-gads-refresh-token.mjs
// Then open the printed URL in your browser and approve access.

import http from "http";
import { URL } from "url";

const CLIENT_ID =
  "960440447654-o4q0gqe8gu74347pnoqk36p8pkjq5ev7.apps.googleusercontent.com";
const CLIENT_SECRET = "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";
const PORT = 4242;
const REDIRECT_URI = `http://localhost:${PORT}`;

const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.searchParams.set("client_id", CLIENT_ID);
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/adwords");
authUrl.searchParams.set("access_type", "offline");
authUrl.searchParams.set("prompt", "consent");

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  Google Ads OAuth2 — Refresh Token Generator");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
console.log("1. Open this URL in your browser:\n");
console.log("   " + authUrl.toString());
console.log("\n2. Sign in with the Google account that owns the MCC,");
console.log("   then click Allow.\n");
console.log("Waiting for callback on http://localhost:" + PORT + " …\n");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<h2>Error: " + (error ?? "no code received") + "</h2>");
    server.close();
    console.error("OAuth error:", error ?? "no code received");
    return;
  }

  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(
    "<html><body style='font-family:sans-serif;padding:40px'>" +
      "<h2>✅ Authorised! You can close this tab.</h2>" +
      "<p>Check your terminal for the refresh token.</p>" +
      "</body></html>"
  );
  server.close();

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }).toString(),
  });

  const tokens = await tokenRes.json();

  if (tokens.refresh_token) {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅  Success! Add this to your .env.local:\n");
    console.log("GOOGLE_ADS_REFRESH_TOKEN=" + tokens.refresh_token);
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  } else {
    console.error("\n❌ No refresh token returned. Full response:");
    console.error(JSON.stringify(tokens, null, 2));
    if (tokens.error === "invalid_grant") {
      console.error(
        "\nTip: Make sure you used 'prompt=consent' — the URL above includes it."
      );
    }
  }
});

server.listen(PORT, "127.0.0.1", () => {});
