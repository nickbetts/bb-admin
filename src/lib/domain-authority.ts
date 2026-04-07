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

  const basicAuth = btoa(`${accessId}:${secretKey}`);

  const response = await fetch("https://lsapi.seomoz.com/v2/url_metrics", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${basicAuth}`,
    },
    body: JSON.stringify({ targets: [domain] }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Moz API error ${response.status}: ${body}`);
  }

  const data = await response.json();
  const result = data.results?.[0] ?? {};

  return {
    domain,
    domainAuthority: Math.round(result.domain_authority ?? 0),
    pageAuthority: Math.round(result.page_authority ?? 0),
    spamScore: Math.round(result.spam_score ?? 0),
    totalLinks: result.pages_to_root_domain ?? 0,
    rootDomainsLinking: result.root_domains_to_root_domain ?? 0,
    source: "moz",
  };
}
