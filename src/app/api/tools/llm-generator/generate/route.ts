import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { crawlSiteForKeywordContext } from "@/lib/landing-page-analyzer";
import OpenAI from "openai";
import { getOpenAiClient, logOpenAiUsage, logResponsesUsage } from "@/lib/openai-client";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

// ─── SSRF-safe URL validation / normalisation ────────────────────────────────
// The generate route fetches arbitrary user-supplied URLs (homepage, sitemap,
// robots.txt, HEAD checks). Validate the host to prevent the server being used
// to reach internal/metadata endpoints (OWASP A10: SSRF).

const PRIVATE_HOST_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /\.local$/i,
  /^127\./,
  /^0\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./, // link-local / cloud metadata (169.254.169.254)
  /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0 – 172.31.255.255
  /^::1$/,
  /^fe80:/i, // IPv6 link-local
  /^fc00:/i, // IPv6 unique-local
  /^fd[0-9a-f]{2}:/i,
];

function validateAndNormalizeUrl(raw: string): { url: string } | { error: string } {
  let candidate = raw.trim();
  if (!candidate) return { error: "A website URL is required" };
  // Prepend https:// when the user omits the scheme so https://example.org works.
  if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { error: "That does not look like a valid website URL" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { error: "Only http and https URLs are supported" };
  }
  const host = parsed.hostname.toLowerCase();
  if (!host.includes(".") && host !== "localhost") {
    return { error: "Enter a full domain, for example https://example.org" };
  }
  if (PRIVATE_HOST_PATTERNS.some((re) => re.test(host))) {
    return { error: "Private, local, and internal addresses are not allowed" };
  }

  // Normalise: drop trailing slash, strip hash/search noise from the base.
  const normalized = `${parsed.protocol}//${parsed.host}${parsed.pathname}`.replace(/\/$/, "");
  return { url: normalized };
}

// ─── Extract social media profiles from raw HTML ──────────────────────────────

function extractSocialProfiles(html: string): string[] {
  const profiles: string[] = [];
  const patterns: [RegExp, string][] = [
    [/https?:\/\/(?:www\.)?facebook\.com\/[a-zA-Z0-9._%-]+(?:\/)?(?!\?)/g, "facebook"],
    [/https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9._%-]+(?:\/)?(?!\?)/g, "instagram"],
    [/https?:\/\/(?:www\.)?twitter\.com\/[a-zA-Z0-9_]+(?:\/)?(?!\?)/g, "twitter"],
    [/https?:\/\/(?:www\.)?x\.com\/[a-zA-Z0-9_]+(?:\/)?(?!\?)/g, "x"],
    [/https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[a-zA-Z0-9._%-]+(?:\/)?/g, "linkedin"],
    [/https?:\/\/(?:www\.)?youtube\.com\/(?:channel|user|c|@)[/a-zA-Z0-9._%-]+/g, "youtube"],
    [/https?:\/\/(?:www\.)?tiktok\.com\/@[a-zA-Z0-9._%-]+/g, "tiktok"],
  ];
  for (const [pattern] of patterns) {
    const matches = html.match(pattern) ?? [];
    for (const m of matches) {
      const clean = m.replace(/['")\]>]+$/, "");
      if (!profiles.includes(clean)) profiles.push(clean);
    }
  }
  return profiles.slice(0, 10);
}

// ─── Server-side cleanup: strip placeholder "not found" values ────────────────
// The AI sometimes writes "not found in research data" as a value instead of
// omitting the field. This pass removes those lines and any orphaned parent keys.

function sanitizeNotFound(text: string): string {
  const NOT_FOUND = /not found(?: in research data)?|insert if applicable/i;

  const lines = text.split("\n");

  // Pass 1: remove lines whose value is a "not found" placeholder
  const pass1 = lines.filter((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || trimmed === "") return true; // keep comments/blanks
    // List items: "  - not found..."
    if (/^-\s/.test(trimmed) && NOT_FOUND.test(trimmed)) return false;
    // Key-value: "field_name: not found..."
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx > 0) {
      const val = trimmed.slice(colonIdx + 1).trim();
      if (NOT_FOUND.test(val)) return false;
    }
    return true;
  });

  // Pass 2: remove orphaned YAML parent keys that now have no children
  const result: string[] = [];
  for (let i = 0; i < pass1.length; i++) {
    const line = pass1[i];
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || trimmed === "") {
      result.push(line);
      continue;
    }
    // A dangling parent is a line like "key:" with nothing after the colon
    const isDangling = /^(\s*)[\w_]+\s*:\s*$/.test(line);
    if (isDangling) {
      const thisIndent = line.search(/\S/);
      let hasChildren = false;
      for (let j = i + 1; j < pass1.length; j++) {
        const next = pass1[j];
        if (next.trim() === "" || next.trim().startsWith("#")) continue;
        if (next.search(/\S/) > thisIndent) {
          hasChildren = true;
          break;
        }
        break;
      }
      if (!hasChildren) continue; // drop the orphaned parent
    }
    result.push(line);
  }

  return result.join("\n");
}

// ─── Extract page URLs from raw sitemap XML ─────────────────────────────────────
// Returns clean URL strings from <loc> tags so the AI receives a verified list
// instead of raw XML that it may fail to parse.

function extractSitemapUrls(rawText: string, limit = 60): string[] {
  const locPattern = /<loc>\s*(https?:\/\/[^\s<]+)\s*<\/loc>/gi;
  const urls: string[] = [];
  let match;
  while ((match = locPattern.exec(rawText)) !== null && urls.length < limit) {
    urls.push(match[1].trim());
  }
  return urls;
}

// ─── Fetch publicly accessible auxiliary data (sitemap, robots.txt) ────────────
// These endpoints typically work even when the homepage is Cloudflare-blocked.
// They give us real internal URLs and crawl priority signals.

async function fetchAuxiliaryData(baseUrl: string): Promise<string> {
  const parts: string[] = [];
  const UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

  const tryFetch = async (url: string, label: string, maxBytes = 60_000): Promise<void> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": UA, Accept: "text/html,text/xml,application/xml,text/plain,*/*" },
        redirect: "follow",
      });
      clearTimeout(timer);
      if (res.ok) {
        const text = (await res.text()).slice(0, maxBytes);
        parts.push(`=== ${label} ===\n${text}`);
      }
    } catch {
      clearTimeout(timer);
    }
  };

  await Promise.allSettled([
    tryFetch(`${baseUrl}/sitemap.xml`, "SITEMAP.XML"),
    tryFetch(`${baseUrl}/sitemap_index.xml`, "SITEMAP_INDEX.XML"),
    tryFetch(`${baseUrl}/robots.txt`, "ROBOTS.TXT"),
  ]);

  return parts.join("\n\n");
}

// ─── Authority / charity register search (always runs for charity sector) ──────
// Targets the Charity Commission register, Companies House, and other authoritative
// public sources to fill registration details the site itself may not make obvious.

async function searchAuthorityRegisters(openai: OpenAI, url: string): Promise<string | null> {
  try {
    const domain = new URL(url).hostname.replace(/^www\./, "");
    const result = await openai.responses.create({
      model: "gpt-4o-search-preview",
      tools: [{ type: "web_search_preview" as const }],
      input: `Look up the UK charity at ${url} (domain: ${domain}) on authoritative public registers. Specifically:
1. Search register-of-charities.charitycommission.gov.uk for the charity — find its registered charity number, registered legal name, registered address, date of registration, charitable objects, and current income/expenditure figures.
2. Search find-and-update.company-information.service.gov.uk (Companies House) for any associated company number.
3. Find the names of current trustees, board chair, CEO or executive director.
4. Find whether they are registered with the Fundraising Regulator (fundraisingregulator.org.uk).
5. Find their registered office address and main phone number.
6. Find which countries they operate in from any overview sources.
Provide exact numbers, names, and URLs from the registers — not summaries.`,
    });
    await logResponsesUsage("llm-generator:authority-search", result);
    return result.output_text;
  } catch {
    return null;
  }
}

// ─── Web search fallback (used when site blocks direct crawl) ─────────────────
// Runs three targeted searches in parallel for maximum coverage.

async function webSearchForSite(openai: OpenAI, url: string, sector: string): Promise<string> {
  const domain = new URL(url).hostname.replace(/^www\./, "");

  const [identityResult, programmesResult, socialResult, pagesResult] = await Promise.allSettled([
    // Search 1: Legal identity — additional targeted sources beyond the authority search
    openai.responses.create({
      model: "gpt-4o-search-preview",
      tools: [{ type: "web_search_preview" as const }],
      input: `Research the ${sector} organisation at ${url} (domain: ${domain}). Find: the full legal organisation name, year founded, founder names, mission statement (exact wording), vision statement, stated values, headquarters city and country, about page URL, governance page URL. Also search the charity's own website for: privacy policy URL, terms and conditions URL, contact page URL, cookie policy URL, complaints policy URL, safeguarding page URL. Look at the footer and header navigation for these links.`,
    }),

    // Search 2: Programmes, beneficiaries, geography, impact statistics, campaigns
    openai.responses.create({
      model: "gpt-4o-search-preview",
      tools: [{ type: "web_search_preview" as const }],
      input: `Research ${url} and the ${sector} organisation at ${domain}. Find specific details about: all named programmes, appeals, and campaigns (with their EXACT URLs and descriptions), beneficiary groups and eligibility, every country and region where they operate, impact statistics with real numbers (people helped, meals provided, water wells, schools, clinics, children sponsored, families supported), annual report findings, evidence of impact, seasonal campaigns (Ramadan, Qurbani, Zakat, winter, etc.), faith-based giving options, donation types accepted, and volunteering opportunities.`,
    }),

    // Search 3: Social media, contact, partnerships, accreditations, media coverage
    openai.responses.create({
      model: "gpt-4o-search-preview",
      tools: [{ type: "web_search_preview" as const }],
      input: `Research ${url} and "${domain}". Find: exact URLs for all social media profiles (Facebook, Instagram, Twitter/X, LinkedIn, YouTube, TikTok), general contact email address, phone number, media or press email, institutional or implementation partners, corporate partners, accreditations, charity memberships (e.g. NCVO, Fundraising Regulator), any media coverage or press mentions, awards received, and any notable news stories about this organisation.`,
    }),

    // Search 4: Real page URLs — only verified pages that actually exist on the site
    openai.responses.create({
      model: "gpt-4o-search-preview",
      tools: [{ type: "web_search_preview" as const }],
      input: `Find the actual real pages that exist on the website ${url}. Check the sitemap at ${url}/sitemap.xml if it exists. Look for the real exact URLs for pages like: about, donate, get involved, impact, programmes, annual reports, privacy policy, terms, contact, FAQ, blog, news, volunteer, safeguarding, governance, trustees, resources, stories. List ONLY exact URLs you can confirm actually exist on this website — do not guess paths. If ${url}/sitemap.xml is accessible list the URLs from it.`,
    }),
  ]);

  const sections: string[] = [];

  if (identityResult.status === "fulfilled") {
    await logResponsesUsage("llm-generator:web-search", identityResult.value);
    sections.push(
      `=== IDENTITY, REGISTRATION & LEADERSHIP ===\n${identityResult.value.output_text}`,
    );
  }
  if (programmesResult.status === "fulfilled") {
    await logResponsesUsage("llm-generator:web-search", programmesResult.value);
    sections.push(`=== PROGRAMMES, IMPACT & CAMPAIGNS ===\n${programmesResult.value.output_text}`);
  }
  if (socialResult.status === "fulfilled") {
    await logResponsesUsage("llm-generator:web-search", socialResult.value);
    sections.push(
      `=== SOCIAL MEDIA, CONTACT & PARTNERSHIPS ===\n${socialResult.value.output_text}`,
    );
  }
  if (pagesResult.status === "fulfilled") {
    await logResponsesUsage("llm-generator:web-search", pagesResult.value);
    sections.push(
      `=== VERIFIED PAGE URLS FROM SITEMAP/NAVIGATION ===\n${pagesResult.value.output_text}`,
    );
  }

  if (sections.length === 0) throw new Error("All web searches failed");

  return sections.join("\n\n");
}

// ─── URL verification: remove URLs that return 404 ──────────────────────────────
// Only removes confirmed 404s; keeps 403s (blocked but may exist) and timeouts.

async function verifyTargetUrls(targetDomain: string, text: string): Promise<Set<string>> {
  const urlPattern = /https?:\/\/[^\s"',\]\)>]+/g;
  const allUrls = [...new Set(text.match(urlPattern) ?? [])];
  const targetUrls = allUrls.filter((u) => {
    try {
      return new URL(u).hostname.replace(/^www\./, "") === targetDomain;
    } catch {
      return false;
    }
  });

  const deadUrls = new Set<string>();

  await Promise.allSettled(
    targetUrls.map(async (pageUrl) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6_000);
      try {
        const res = await fetch(pageUrl, {
          method: "HEAD",
          signal: controller.signal,
          redirect: "follow",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          },
        });
        if (res.status === 404) {
          deadUrls.add(pageUrl);
        } else if (res.status === 405) {
          // HEAD not allowed — retry with GET to check existence
          const res2 = await fetch(pageUrl, {
            method: "GET",
            signal: controller.signal,
            redirect: "follow",
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            },
          });
          if (res2.status === 404) deadUrls.add(pageUrl);
        }
      } catch {
        // Timeout or connection error — assume page may exist, don't remove
      } finally {
        clearTimeout(timer);
      }
    }),
  );

  return deadUrls;
}

// ─── Route Handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as {
      website?: string;
      templateId?: string;
      clientId?: string;
      /** Force web search enrichment even when the site crawls successfully */
      webSearch?: boolean;
    };
    const { website, templateId, clientId, webSearch } = body;

    if (!website?.trim() || !templateId?.trim()) {
      return NextResponse.json({ error: "website and templateId are required" }, { status: 400 });
    }

    const validation = validateAndNormalizeUrl(website);
    if ("error" in validation) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const normalizedWebsite = validation.url;
    const startedAt = Date.now();

    // ── Load template ──────────────────────────────────────────────────────
    const template = await prisma.llmTemplate.findUnique({ where: { id: templateId } });
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const openai = await getOpenAiClient();

    // ── Crawl website ──────────────────────────────────────────────────────
    const crawl = await crawlSiteForKeywordContext(normalizedWebsite, 12);

    if (crawl.homepageError) {
      // Hard fail only for connection errors (DNS failure, timeout, etc.)
      // For HTTP 4xx/5xx, the site is reachable but blocking crawlers — fall back to web search
      const isHttpBlocked = /^HTTP (4|5)\d\d/.test(crawl.homepageError);
      if (!isHttpBlocked) {
        return NextResponse.json(
          {
            error: `Could not reach the website: ${crawl.homepageError}`,
          },
          { status: 422 },
        );
      }
      // Fall through — will use web search fallback below
    }

    // ── Fetch auxiliary data + always-run authority search in parallel with crawl
    const [auxiliaryDataResult, authoritySearchResult] = await Promise.allSettled([
      fetchAuxiliaryData(normalizedWebsite),
      template.sector.toLowerCase().includes("charit") ||
      template.sector.toLowerCase().includes("nonprofit") ||
      template.sector.toLowerCase().includes("non-profit")
        ? searchAuthorityRegisters(openai, normalizedWebsite)
        : Promise.resolve(null),
    ]);

    const auxiliaryData =
      auxiliaryDataResult.status === "fulfilled" ? auxiliaryDataResult.value : "";
    const authorityData =
      authoritySearchResult.status === "fulfilled" ? (authoritySearchResult.value ?? "") : "";

    // ── Detect thin crawl content ─────────────────────────────────────────────
    // JS-rendered sites (Cloudflare, React, Next.js) can return HTTP 200 but
    // a hollow app shell — almost no text for the crawler to extract.
    // Trigger web search enrichment in this case just as we do for hard 4xx blocks.
    const crawlWasBlocked = Boolean(
      crawl.homepageError && /^HTTP (4|5)\d\d/.test(crawl.homepageError),
    );
    const crawlRawContent = crawl.contextLines.join("\n");
    const crawlIsThin =
      crawlRawContent.replace(/\s+/g, " ").trim().length < 1500 || crawl.pagesCrawled.length < 2;
    const shouldUseWebSearch = crawlWasBlocked || crawlIsThin || Boolean(webSearch);

    // ── Web search fallback / enrichment ─────────────────────────────────────
    let webSearchData: string | null = null;
    if (shouldUseWebSearch) {
      try {
        webSearchData = await webSearchForSite(openai, normalizedWebsite, template.sector);
      } catch (err) {
        console.warn("Web search fallback failed:", err);
        // Not fatal — proceed with minimal data
      }
    }

    // ── Also fetch raw homepage HTML to extract social links ───────────────
    let socialProfiles: string[] = [];
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8_000);
      const res = await fetch(normalizedWebsite, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-GB,en;q=0.9",
          "Cache-Control": "max-age=0",
          "Upgrade-Insecure-Requests": "1",
        },
        redirect: "follow",
      });
      clearTimeout(timer);
      if (res.ok) {
        const html = await res.text();
        socialProfiles = extractSocialProfiles(html);
      }
    } catch {
      // Best-effort
    }

    const today = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const todayISO = new Date().toISOString().slice(0, 10);

    const crawlData = crawl.contextLines.join("\n") || "No page content could be extracted.";

    // Extract verified page URLs from sitemap XML so the AI doesn't have to parse raw XML.
    const sitemapUrls = extractSitemapUrls(auxiliaryData);
    const verifiedSitemapBlock =
      sitemapUrls.length > 0
        ? `\n=== VERIFIED PAGES FROM SITEMAP (these URLs are confirmed real — use them directly in URL fields) ===\n${sitemapUrls.join("\n")}\n`
        : "";

    const noDataReason = crawlWasBlocked
      ? `The website returned ${crawl.homepageError} — direct crawling was blocked`
      : crawlIsThin
        ? `The website appears to be JavaScript-rendered — the crawler received a thin page shell with little usable content`
        : "";
    const crawlBlockedNote =
      shouldUseWebSearch && !webSearchData && noDataReason
        ? `\nNOTE: ${noDataReason}, and web search fallback also failed. Use the website URL and domain name to infer the organisation name, sector, and structure. Fill what you reasonably can; use "Insert if applicable" for anything that requires real page data.\n`
        : "";
    const socialData =
      socialProfiles.length > 0
        ? `\nSocial media profiles found on homepage:\n${socialProfiles.join("\n")}`
        : "\nNo social media profiles found on homepage.";

    // Build data section: prefer web search results over blocked / thin crawl
    const authorityBlock = authorityData
      ? `\n=== CHARITY REGISTER & AUTHORITY DATA (Charity Commission, Companies House) ===\n${authorityData}\n`
      : "";
    const auxiliaryBlock = auxiliaryData
      ? `\n=== SITEMAP / ROBOTS.TXT (real internal URLs) ===\n${auxiliaryData}\n`
      : "";

    const dataSection = webSearchData
      ? `--- WEB SEARCH RESEARCH DATA ---\n(Direct crawl ${crawlWasBlocked ? "was blocked" : crawlIsThin ? "returned thin content (JS-rendered site)" : "was supplemented"} — the following was gathered via web search)\n${webSearchData}\n${socialData}${authorityBlock}${auxiliaryBlock}${verifiedSitemapBlock}\n--- END WEB SEARCH DATA ---`
      : `--- CRAWLED WEBSITE DATA ---\n${crawlData}\n${socialData}${authorityBlock}${auxiliaryBlock}${verifiedSitemapBlock}\n${crawlBlockedNote}--- END CRAWLED DATA ---`;

    const prompt = `You are an expert in AI search optimisation, LLM indexing, and llm.txt files. Your task is to generate a complete, accurate llm.txt file for the website below.

Today's date: ${today} (ISO: ${todayISO})
Website URL: ${normalizedWebsite}
Sector: ${template.sector}
Template: ${template.name}

${dataSection}

TEMPLATE STRUCTURE TO FOLLOW:
${template.templateText}
${template.promptGuidance ? `\nSTRATEGIC GUIDANCE — SECTION PRIORITY AND QUALITY RULES:\n${template.promptGuidance}\n` : ""}
CRITICAL INSTRUCTIONS — READ CAREFULLY:
1. Fill in EVERY field and list item using only verified real data from the research data above
2. Replace [Charity Name] with the actual organisation name found in the research
3. Replace [domain] in all URLs with the actual domain slug (e.g. "orphansinneed" for orphansinneed.org.uk) — but ONLY for URLs you have confirmed actually exist in the research data
4. Replace [YYYY-MM-DD] with ${todayISO}
5. REMOVE any field, list item, or entire section block for which you cannot find real data — do NOT leave "Insert if applicable" anywhere in the output. Every value in the final file must be real and verified.
   CRITICAL URL RULE: For every URL field, you must have seen that exact URL (or a URL clearly pointing to that page) in the research data above. URLs listed in the "VERIFIED PAGES FROM SITEMAP" section ARE confirmed real pages on this domain — you may use them directly in URL fields. For all other URL fields, NEVER construct a URL by guessing a path like /safeguarding, /governance, /trustees, /financials etc. If you did not find the specific URL in the research data or the sitemap, remove that URL field entirely.
6. After the main llm.txt content, append a final comment block headed "## DATA GAPS" that lists every field or section you removed and a one-line reason why (e.g. "not found in research data"). Format as YAML comments (# prefixed lines).
7. Keep ALL section headers, comment lines (# lines), and YAML formatting exactly as shown in the template for fields you DO fill
8. Write in British English throughout
9. Do NOT add explanatory prose, markdown code fences, or any content outside the llm.txt structure itself
10. Be specific and accurate — use exact numbers, exact programme names, exact registration numbers where found; do not pad with vague generics

Output the complete filled-in llm.txt followed by the ## DATA GAPS block. No preamble, no code fences.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are an expert in AI search optimisation and llm.txt file generation. You produce accurate, specific llm.txt files based only on verified real data. You NEVER use placeholder text like 'Insert if applicable' — if data is unavailable you remove that field entirely and log it in the DATA GAPS block. You output only the raw llm.txt content followed by the DATA GAPS section. No markdown formatting, no code fences, no preamble.",
        },
        { role: "user", content: prompt },
      ],
    });

    await logOpenAiUsage("llm-generator", completion);

    let output = completion.choices[0].message.content ?? "";

    // ── Server-side sanitize: strip any "not found" placeholders the AI left in
    output = sanitizeNotFound(output);

    // ── Post-generation URL verification: strip confirmed 404 links ────────
    let deadUrlCount = 0;
    try {
      const targetDomain = new URL(normalizedWebsite).hostname.replace(/^www\./, "");
      const deadUrls = await verifyTargetUrls(targetDomain, output);
      deadUrlCount = deadUrls.size;
      if (deadUrls.size > 0) {
        output = output
          .split("\n")
          .filter((line) => {
            for (const dead of deadUrls) {
              if (line.includes(dead)) return false;
            }
            return true;
          })
          .join("\n");
        // Append removed URLs to DATA GAPS block
        const gapNote = [...deadUrls].map((u) => `# REMOVED (404 confirmed): ${u}`).join("\n");
        output += `\n\n## URLS REMOVED (returned 404)\n${gapNote}`;
      }
    } catch {
      // Best-effort — return unfiltered if verification errors
    }

    // ── Persist the generation so the team can revisit, share, and link it
    //    to a client. Best-effort: never fail the request if saving errors.
    const generationMs = Date.now() - startedAt;
    let savedId: string | null = null;
    try {
      const domainLabel = new URL(normalizedWebsite).hostname.replace(/^www\./, "");
      let resolvedClientId: string | null = null;
      if (clientId?.trim()) {
        const client = await prisma.client.findUnique({
          where: { id: clientId.trim() },
          select: { id: true },
        });
        resolvedClientId = client?.id ?? null;
      }
      const saved = await prisma.llmGeneration.create({
        data: {
          clientId: resolvedClientId,
          userId: session.user.id,
          createdByEmail: session.user.email,
          title: domainLabel,
          website: normalizedWebsite,
          templateId: template.id,
          templateName: template.name,
          sector: template.sector,
          output,
          pagesCrawled: crawl.pagesCrawled.length,
          deadUrlsRemoved: deadUrlCount,
          usedWebSearchFallback: Boolean(webSearchData),
          authorityDataUsed: Boolean(authorityData),
          socialProfilesFound: socialProfiles.length,
          generationMs,
        },
        select: { id: true },
      });
      savedId = saved.id;
    } catch (saveErr) {
      console.error("llm-generator: failed to persist generation", saveErr);
    }

    return NextResponse.json({
      id: savedId,
      output,
      pagesCrawled: crawl.pagesCrawled.length,
      deadUrlsRemoved: deadUrlCount,
      meta: {
        usedWebSearchFallback: Boolean(webSearchData),
        crawlBlocked: crawlWasBlocked,
        crawlThin: crawlIsThin,
        webSearchForced: Boolean(webSearch),
        authorityDataUsed: Boolean(authorityData),
        auxiliaryDataUsed: Boolean(auxiliaryData),
        socialProfilesFound: socialProfiles.length,
        clientId: clientId?.trim() || null,
        generationMs,
      },
    });
  } catch (err) {
    console.error("llm-generator error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
