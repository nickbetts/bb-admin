/**
 * Exchange a short-lived Meta User Access Token for a long-lived one (60 days).
 *
 * Usage:
 *   node scripts/get-meta-long-lived-token.mjs <short_lived_token>
 *
 * Requires META_APP_ID and META_APP_SECRET in your .env.local, or pass them
 * as environment variables directly:
 *   META_APP_ID=xxx META_APP_SECRET=yyy node scripts/get-meta-long-lived-token.mjs <token>
 *
 * After running, copy the printed token into your .env.local and Vercel env vars.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env.local so we can read APP_ID / APP_SECRET from there ────────────
function loadEnv() {
  const envPath = resolve(__dirname, "../.env.local");
  try {
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env.local not present — rely on environment variables
  }
}

loadEnv();

const APP_ID = process.env.META_APP_ID;
const APP_SECRET = process.env.META_APP_SECRET;
const shortLivedToken = process.argv[2];

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  Meta Ads — Long-Lived Token Exchange");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

if (!shortLivedToken) {
  console.error("❌  No short-lived token provided.\n");
  console.error("Usage: node scripts/get-meta-long-lived-token.mjs <short_lived_token>\n");
  process.exit(1);
}

if (!APP_ID || !APP_SECRET) {
  console.error("❌  META_APP_ID and/or META_APP_SECRET not set.\n");
  console.error("Add them to .env.local or prefix the command:\n");
  console.error("  META_APP_ID=xxx META_APP_SECRET=yyy node scripts/get-meta-long-lived-token.mjs <token>\n");
  process.exit(1);
}

const url = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
url.searchParams.set("grant_type", "fb_exchange_token");
url.searchParams.set("client_id", APP_ID);
url.searchParams.set("client_secret", APP_SECRET);
url.searchParams.set("fb_exchange_token", shortLivedToken);

console.log("Exchanging short-lived token…\n");

const res = await fetch(url.toString());
const json = await res.json();

if (json.error) {
  console.error("❌  Meta API error:", json.error.message);
  process.exit(1);
}

const longLivedToken = json.access_token;
const expiresIn = json.expires_in; // seconds
const expiresInDays = expiresIn ? Math.round(expiresIn / 86400) : "~60";

console.log("✅  Long-lived access token obtained!\n");
console.log("Token expires in:", `${expiresInDays} days\n`);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("META_ACCESS_TOKEN=" + longLivedToken);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
console.log("Next steps:");
console.log("  1. Copy the token above into your .env.local file");
console.log("  2. Run: node scripts/push-env-to-vercel.py  (or set it manually in Vercel)");
console.log("  3. Redeploy your Vercel project or run: npx vercel env pull .env.local\n");
console.log("Note: Long-lived tokens last ~60 days. Re-run this script before they expire.\n");
