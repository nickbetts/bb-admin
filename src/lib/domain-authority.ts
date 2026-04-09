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

export interface MozLinkIntersect {
  linkingDomain: string;
  domainAuthority: number;
  linksToCompetitors: { domain: string; linked: boolean }[];
  linksToTarget: boolean;
}

export async function getMozLinkIntersect(
  targetDomain: string,
  competitorDomains: string[]
): Promise<MozLinkIntersect[]> {
  const accessId = process.env.MOZ_ACCESS_ID || FALLBACK_MOZ_ACCESS_ID;
  const secretKey = process.env.MOZ_SECRET_KEY || FALLBACK_MOZ_SECRET_KEY;
  const basicAuth = btoa(`${accessId}:${secretKey}`);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Basic ${basicAuth}`,
  };

  const fetchLinks = async (domain: string) => {
    const res = await fetch("https://lsapi.seomoz.com/v2/linking_root_domains", {
      method: "POST",
      headers,
      body: JSON.stringify({
        target: domain,
        target_type: "root_domain",
        limit: 50,
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return ((data.results ?? []) as { source_domain?: string; domain_authority?: number }[]).map((r) => ({
      domain: r.source_domain ?? "",
      authority: Math.round(r.domain_authority ?? 0),
    }));
  };

  try {
    const [targetLinks, ...competitorLinks] = await Promise.all([
      fetchLinks(targetDomain),
      ...competitorDomains.slice(0, 5).map((d) => fetchLinks(d)),
    ]);

    const targetDomainSet = new Set(targetLinks.map((l) => l.domain));

    // Find domains linking to competitors but not target
    const intersectMap = new Map<string, { authority: number; competitors: Set<string> }>();

    competitorDomains.forEach((compDomain, idx) => {
      for (const link of competitorLinks[idx] ?? []) {
        if (!targetDomainSet.has(link.domain)) {
          const existing = intersectMap.get(link.domain);
          if (existing) {
            existing.competitors.add(compDomain);
          } else {
            intersectMap.set(link.domain, {
              authority: link.authority,
              competitors: new Set([compDomain]),
            });
          }
        }
      }
    });

    return Array.from(intersectMap.entries())
      .map(([linkingDomain, data]) => ({
        linkingDomain,
        domainAuthority: data.authority,
        linksToCompetitors: competitorDomains.map((d) => ({
          domain: d,
          linked: data.competitors.has(d),
        })),
        linksToTarget: false,
      }))
      .sort((a, b) => b.domainAuthority - a.domainAuthority)
      .slice(0, 50);
  } catch (error) {
    console.error("Moz link intersect error:", error);
    return [];
  }
}
