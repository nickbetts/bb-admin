export interface DomainAuthorityResult {
  domain: string;
  domainAuthority: number;
  pageAuthority: number;
  spamScore: number;
  totalLinks: number;
  rootDomainsLinking: number;
  source: "moz";
}

const FALLBACK_MOZ_ACCESS_ID = "mozscape-9b46e99efb";
const FALLBACK_MOZ_SECRET_KEY = "ed054868472da9ea545f8c2466af2fa0";

export async function getDomainAuthority(domain: string): Promise<DomainAuthorityResult> {
  const accessId = process.env.MOZ_ACCESS_ID || FALLBACK_MOZ_ACCESS_ID;
  const secretKey = process.env.MOZ_SECRET_KEY || FALLBACK_MOZ_SECRET_KEY;

  const expires = Math.floor(Date.now() / 1000) + 300;
  const stringToSign = `${accessId}\n${expires}`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const msgData = encoder.encode(stringToSign);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
  const base64Sig = btoa(String.fromCharCode(...new Uint8Array(signature)));
  const authSig = encodeURIComponent(base64Sig);

  const cols = 103079215108; // DA + PA + spam score + links + root domains
  const url = `https://lsapi.seomoz.com/v2/url_metrics/${encodeURIComponent(`http://${domain}`)}?Cols=${cols}&AccessID=${accessId}&Expires=${expires}&Signature=${authSig}`;

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Moz API error ${response.status}: ${body}`);
  }

  const data = await response.json();

  return {
    domain,
    domainAuthority: Math.round(data.pda ?? data.domain_authority ?? 0),
    pageAuthority: Math.round(data.upa ?? data.page_authority ?? 0),
    spamScore: Math.round(data.spam_score ?? 0),
    totalLinks: data.ueid ?? data.total_links ?? 0,
    rootDomainsLinking: data.uid ?? data.root_domains_linking ?? 0,
    source: "moz",
  };
}
