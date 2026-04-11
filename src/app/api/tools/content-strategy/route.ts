import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAnthropicClient } from "@/lib/anthropic-client";
import * as XLSX from "xlsx";
import mammoth from "mammoth";
import crypto from "crypto";

// ─── Spreadsheet parsing ────────────────────────────────────────────────────

interface ParsedKeyword {
  keyword: string;
  volume: number;
}

interface PageOptimisation {
  url: string;
  keywords: ParsedKeyword[];
  notes: string;
  priority: boolean;
  impact?: number;
  effort?: number;
  quickWin?: boolean;
}

interface ProposedPage {
  title: string;
  keywords: ParsedKeyword[];
  notes: string;
  priority: boolean;
  impact?: number;
  effort?: number;
}

interface BlogPost {
  title: string;
  keywords: ParsedKeyword[];
  notes: string;
  priority: boolean;
  impact?: number;
  effort?: number;
  cluster?: string;
}

interface LinkTarget {
  url: string;
  anchorKeyword: string;
  anchorType: string;
  impact?: number;
  effort?: number;
}

interface SpreadsheetData {
  clientName: string;
  period: string;
  pageOptimisations: PageOptimisation[];
  landingPages: ProposedPage[];
  categoryPages: ProposedPage[];
  blogPosts: BlogPost[];
  linkTargets: LinkTarget[];
  quickWins?: PageOptimisation[];
  roadmap?: {
    month1: string[];
    months2to3: string[];
    months4plus: string[];
  };
  stats: {
    totalPageOptimisations: number;
    totalLandingPages: number;
    totalBlogPosts: number;
    totalLinkTargets: number;
  };
}

// ─── Text extraction from various file formats ─────────────────────────────

async function extractTextFromFile(buffer: ArrayBuffer, fileName: string): Promise<string> {
  const ext = fileName.toLowerCase().split(".").pop() || "";

  if (ext === "xlsx" || ext === "xls") {
    return extractTextFromSpreadsheet(buffer);
  }
  if (ext === "docx") {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
    return result.value;
  }
  if (ext === "csv" || ext === "txt") {
    return new TextDecoder("utf-8").decode(buffer);
  }
  throw new Error(`Unsupported file format: .${ext}`);
}

function extractTextFromSpreadsheet(buffer: ArrayBuffer): string {
  const wb = XLSX.read(buffer, { type: "array" });
  const lines: string[] = [];
  for (const sheetName of wb.SheetNames) {
    lines.push(`=== SHEET: ${sheetName} ===`);
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
    for (const row of rows) {
      if (!Array.isArray(row)) continue;
      const cells = row.map(c => String(c ?? "").trim()).filter(Boolean);
      if (cells.length > 0) lines.push(cells.join("\t"));
    }
    lines.push("");
  }
  return lines.join("\n");
}

// ─── Claude-based structured data extraction ────────────────────────────────

const EXTRACTION_PROMPT = `You are a data extraction assistant. Your job is to extract structured content strategy data from the document provided.

CRITICAL RULES:
1. ONLY extract data that is explicitly present in the document. NEVER invent, guess, or hallucinate keywords, URLs, volumes, or any other data.
2. If a field is not present in the document, omit it or use an empty array.
3. Search volumes must be exact numbers found in the document. If no volume is shown for a keyword, use 0.
4. URLs must be copied exactly as they appear in the document.
5. Keyword text must be copied exactly as it appears in the document.
6. If the document structure is unclear, extract what you can and skip what is ambiguous.

Extract the data into this exact JSON structure:
{
  "pageOptimisations": [
    {
      "url": "example.com/page",
      "keywords": [{"keyword": "example term", "volume": 1000}],
      "notes": ""
    }
  ],
  "landingPages": [
    {
      "title": "Page Title",
      "keywords": [{"keyword": "example term", "volume": 500}],
      "notes": ""
    }
  ],
  "categoryPages": [],
  "blogPosts": [
    {
      "title": "Blog Post Title",
      "keywords": [{"keyword": "example term", "volume": 200}],
      "notes": ""
    }
  ],
  "linkTargets": [
    {
      "url": "example.com/page",
      "anchorKeyword": "anchor text",
      "anchorType": "Exact"
    }
  ]
}

Notes:
- "pageOptimisations" = existing pages that need content updates/improvements
- "landingPages" = new pages to be created (service pages, product pages, category pages)  
- "categoryPages" = if there is a separate category pages section, otherwise put them in landingPages
- "blogPosts" = new blog articles to be written
- "linkTargets" = pages that need backlinks built, with anchor text and type (Exact/Broad/Brand)
- Strip "https://" and "www." prefixes from URLs
- If the document groups keywords under a URL or page title, keep that grouping
- anchorType should be one of: "Exact", "Broad", or "Brand"

Return ONLY the JSON object, no markdown formatting, no explanation.`;

async function extractWithClaude(fileText: string, clientName: string): Promise<SpreadsheetData> {
  const anthropic = await getAnthropicClient();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    system: EXTRACTION_PROMPT,
    messages: [
      {
        role: "user",
        content: `Extract the content strategy data from this document for client "${clientName}":\n\n${fileText.slice(0, 80000)}`,
      },
    ],
  });

  const textBlock = response.content.find(b => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from extraction model");
  }

  let jsonStr = textBlock.text.trim();
  // Strip markdown code fences if present
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();

  const raw = JSON.parse(jsonStr);
  return validateExtractedData(raw);
}

function validateExtractedData(raw: Record<string, unknown>): SpreadsheetData {
  function parseScore(val: unknown): number | undefined {
    const n = Number(val);
    return n >= 1 && n <= 5 ? Math.round(n) : undefined;
  }

  function validateKeyword(k: unknown): ParsedKeyword | null {
    if (!k || typeof k !== "object") return null;
    const obj = k as Record<string, unknown>;
    const keyword = String(obj.keyword || "").trim();
    if (!keyword || keyword.length < 2) return null;
    const volume = Math.max(0, Math.round(Number(obj.volume) || 0));
    return { keyword, volume };
  }

  function validatePageOpt(p: unknown): PageOptimisation | null {
    if (!p || typeof p !== "object") return null;
    const obj = p as Record<string, unknown>;
    const url = String(obj.url || "").trim().replace(/^https?:\/\//, "").replace(/^www\./, "");
    if (!url || url.length < 3) return null;
    const keywords = (Array.isArray(obj.keywords) ? obj.keywords : [])
      .map(validateKeyword).filter((k): k is ParsedKeyword => k !== null);
    if (keywords.length === 0) return null;
    return {
      url,
      keywords,
      notes: String(obj.notes || ""),
      priority: false,
      impact: parseScore(obj.impact),
      effort: parseScore(obj.effort),
      quickWin: obj.quickWin === true,
    };
  }

  function validateProposedPage(p: unknown): ProposedPage | null {
    if (!p || typeof p !== "object") return null;
    const obj = p as Record<string, unknown>;
    const title = String(obj.title || "").trim();
    if (!title || title.length < 2) return null;
    const keywords = (Array.isArray(obj.keywords) ? obj.keywords : [])
      .map(validateKeyword).filter((k): k is ParsedKeyword => k !== null);
    if (keywords.length === 0) return null;
    return {
      title,
      keywords,
      notes: String(obj.notes || ""),
      priority: false,
      impact: parseScore(obj.impact),
      effort: parseScore(obj.effort),
    };
  }

  function validateLinkTarget(t: unknown): LinkTarget | null {
    if (!t || typeof t !== "object") return null;
    const obj = t as Record<string, unknown>;
    const url = String(obj.url || "").trim().replace(/^https?:\/\//, "").replace(/^www\./, "");
    const anchorKeyword = String(obj.anchorKeyword || "").trim();
    if (!url || !anchorKeyword) return null;
    const validTypes = ["exact", "broad", "brand"];
    const anchorType = validTypes.includes(String(obj.anchorType || "").toLowerCase())
      ? String(obj.anchorType) : "Broad";
    return {
      url,
      anchorKeyword,
      anchorType,
      impact: parseScore(obj.impact),
      effort: parseScore(obj.effort),
    };
  }

  const pageOptimisations = (Array.isArray(raw.pageOptimisations) ? raw.pageOptimisations : [])
    .map(validatePageOpt).filter((p): p is PageOptimisation => p !== null);
  const landingPages = (Array.isArray(raw.landingPages) ? raw.landingPages : [])
    .map(validateProposedPage).filter((p): p is ProposedPage => p !== null);
  const categoryPages = (Array.isArray(raw.categoryPages) ? raw.categoryPages : [])
    .map(validateProposedPage).filter((p): p is ProposedPage => p !== null);
  const blogPosts: BlogPost[] = (Array.isArray(raw.blogPosts) ? raw.blogPosts : [])
    .map((p: unknown): BlogPost | null => {
      const validated = validateProposedPage(p);
      if (!validated) return null;
      const obj = p as Record<string, unknown>;
      return {
        ...validated,
        cluster: typeof obj.cluster === "string" && obj.cluster.trim() ? obj.cluster.trim() : undefined,
      };
    }).filter((p): p is BlogPost => p !== null);
  const linkTargets = (Array.isArray(raw.linkTargets) ? raw.linkTargets : [])
    .map(validateLinkTarget).filter((t): t is LinkTarget => t !== null);

  // Pass through quickWins and roadmap from SEMrush-generated data
  const quickWins = Array.isArray(raw.quickWins)
    ? (raw.quickWins as unknown[]).map(validatePageOpt).filter((p): p is PageOptimisation => p !== null)
    : undefined;

  const rawRoadmap = raw.roadmap as Record<string, unknown> | undefined;
  const roadmap = rawRoadmap
    ? {
        month1: Array.isArray(rawRoadmap.month1) ? rawRoadmap.month1.map(String) : [],
        months2to3: Array.isArray(rawRoadmap.months2to3) ? rawRoadmap.months2to3.map(String) : [],
        months4plus: Array.isArray(rawRoadmap.months4plus) ? rawRoadmap.months4plus.map(String) : [],
      }
    : undefined;

  const totalItems = pageOptimisations.length + landingPages.length + categoryPages.length + blogPosts.length + linkTargets.length;
  if (totalItems === 0) {
    throw new Error("Could not extract any content strategy data from the document. Please check the file contains keyword data grouped by page URL or title.");
  }

  return {
    clientName: "",
    period: "",
    pageOptimisations,
    landingPages,
    categoryPages,
    blogPosts,
    linkTargets,
    quickWins,
    roadmap,
    stats: {
      totalPageOptimisations: pageOptimisations.length,
      totalLandingPages: landingPages.length + categoryPages.length,
      totalBlogPosts: blogPosts.length,
      totalLinkTargets: new Set(linkTargets.map(t => t.url)).size,
    },
  };
}

// ─── Legacy spreadsheet parser (fallback) ───────────────────────────────────

function parseSpreadsheet(buffer: ArrayBuffer): SpreadsheetData {
  const wb = XLSX.read(buffer, { type: "array" });

  // Parse page optimisations
  const pageOpts: PageOptimisation[] = [];
  const optSheet = wb.Sheets["Page Optimisations"];
  if (optSheet) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(optSheet, { header: 1, defval: "" });
    let currentUrl = "";
    let currentNotes = "";
    let currentKws: ParsedKeyword[] = [];
    // Common header strings to skip (case-insensitive)
    const headerStrings = new Set(["link", "keyword", "keywords", "url", "page", "page title", "title", "search volume", "monthly searches", "volume", "notes", "anchor", "anchor text", "anchor type", "type"]);
    function isHeader(s: string): boolean { return headerStrings.has(s.toLowerCase()); }

    // Skip header rows (rows 0-5), data starts at row 6 (index 6)
    for (let i = 6; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 4) continue;
      const link = String(row[1] || "").trim();
      const keyword = String(row[2] || "").replace(/\u200b/g, "").trim();
      const volume = Number(row[3]) || 0;
      const notes = String(row[4] || "").trim();

      // Skip rows that are repeated headers or placeholder text
      if (isHeader(link) || isHeader(keyword)) continue;
      // Skip rows with no meaningful keyword content
      if (!keyword || keyword.length < 2) continue;

      if (link && keyword) {
        // New URL group
        if (currentUrl && currentKws.length > 0) {
          pageOpts.push({ url: currentUrl, keywords: currentKws, notes: currentNotes, priority: false });
        }
        currentUrl = link.replace(/^https?:\/\//, "").replace(/^www\./, "");
        currentKws = [{ keyword, volume }];
        currentNotes = notes;
      } else if (keyword && !link) {
        // Additional keyword for current URL
        currentKws.push({ keyword, volume });
        if (notes) currentNotes = notes;
      }
    }
    if (currentUrl && currentKws.length > 0) {
      pageOpts.push({ url: currentUrl, keywords: currentKws, notes: currentNotes, priority: false });
    }
  }

  // Parse proposed pages (landing pages, category pages, blog posts share same format)
  function parseProposedPages(sheetName: string): ProposedPage[] {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) return [];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
    const pages: ProposedPage[] = [];
    let currentTitle = "";
    let currentNotes = "";
    let currentKws: ParsedKeyword[] = [];

    const headerStringsP = new Set(["link", "keyword", "keywords", "url", "page", "page title", "title", "search volume", "monthly searches", "volume", "notes", "anchor", "anchor text", "anchor type", "type"]);
    function isHeaderP(s: string): boolean { return headerStringsP.has(s.toLowerCase()); }

    for (let i = 6; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 4) continue;
      const link = String(row[1] || "").trim();
      const keyword = String(row[2] || "").replace(/\u200b/g, "").trim();
      const volume = Number(row[3]) || 0;
      const notes = String(row[4] || "").trim();

      // Skip rows that are repeated headers or placeholder text
      if (isHeaderP(link) || isHeaderP(keyword)) continue;

      if (link && keyword && keyword.length >= 2) {
        if (currentTitle && currentKws.length > 0) {
          pages.push({ title: currentTitle, keywords: currentKws, notes: currentNotes, priority: false });
        }
        currentTitle = link;
        currentKws = [{ keyword, volume }];
        currentNotes = notes;
      } else if (keyword && keyword.length >= 2 && !link) {
        currentKws.push({ keyword, volume });
        if (notes) currentNotes = notes;
      } else if (link && !isHeaderP(link) && !keyword && notes) {
        // Title-only row with notes (description row)
        if (currentTitle && currentKws.length > 0) {
          pages.push({ title: currentTitle, keywords: currentKws, notes: currentNotes, priority: false });
        }
        currentTitle = link;
        currentKws = [];
        currentNotes = notes;
      }
    }
    if (currentTitle && currentKws.length > 0) {
      pages.push({ title: currentTitle, keywords: currentKws, notes: currentNotes, priority: false });
    }
    return pages;
  }

  const landingPages = parseProposedPages("Proposed Landing Pages");
  const categoryPages = parseProposedPages("Proposed Category Pages");

  // Parse blog posts (same format as proposed pages)
  const blogPosts: BlogPost[] = parseProposedPages("Proposed Blog Pages").map(p => ({
    title: p.title,
    keywords: p.keywords,
    notes: p.notes,
    priority: false,
  }));

  // Parse link targets
  const linkTargets: LinkTarget[] = [];
  const linkSheet = wb.Sheets["Link Targets"];
  if (linkSheet) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(linkSheet, { header: 1, defval: "" });
    const headerStringsL = new Set(["link", "keyword", "keywords", "url", "page", "page title", "title", "search volume", "monthly searches", "volume", "notes", "anchor", "anchor text", "anchor type", "type", "target page"]);
    function isHeaderL(s: string): boolean { return headerStringsL.has(s.toLowerCase()); }

    for (let i = 6; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 4) continue;
      const url = String(row[1] || "").trim();
      const anchor = String(row[2] || "").trim();
      const anchorType = String(row[3] || "").trim();
      // Skip header/placeholder rows
      if (isHeaderL(url) || isHeaderL(anchor)) continue;
      if (url && anchor) {
        linkTargets.push({
          url: url.replace(/^https?:\/\//, "").replace(/^www\./, ""),
          anchorKeyword: anchor,
          anchorType,
        });
      }
    }
  }

  // Count unique page titles / URLs for stats
  const uniquePageOpts = pageOpts.length;
  const uniqueLandingPages = landingPages.length;
  const uniqueBlogPosts = blogPosts.length;
  // Count unique link target URLs
  const uniqueLinkTargets = new Set(linkTargets.map(t => t.url)).size;

  return {
    clientName: "",
    period: "",
    pageOptimisations: pageOpts,
    landingPages,
    categoryPages,
    blogPosts,
    linkTargets,
    stats: {
      totalPageOptimisations: uniquePageOpts,
      totalLandingPages: uniqueLandingPages + categoryPages.length,
      totalBlogPosts: uniqueBlogPosts,
      totalLinkTargets: uniqueLinkTargets,
    },
  };
}

// ─── HTML template generation ───────────────────────────────────────────────

function generateHtml(data: SpreadsheetData, aiContent: Record<string, string>): string {
  const { clientName, period, pageOptimisations, landingPages, categoryPages, blogPosts, linkTargets, quickWins, roadmap, stats } = data;

  let cardIdx = 0;

  function esc(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function escJson(obj: unknown): string { return esc(JSON.stringify(obj)); }

  function formatNum(n: number): string {
    return n.toLocaleString("en-GB");
  }

  // Sort by impact desc
  function sortByImpact<T extends { keywords: ParsedKeyword[]; impact?: number }>(arr: T[], volThreshold: number): T[] {
    return [...arr].sort((a, b) => {
      const bImp = (b.impact ?? 0) * 10 + (b.keywords.some(k => k.volume >= volThreshold) ? 1 : 0);
      const aImp = (a.impact ?? 0) * 10 + (a.keywords.some(k => k.volume >= volThreshold) ? 1 : 0);
      return bImp - aImp;
    });
  }

  // ── Quick wins HTML (pages ranking 4–10 with volume) ──
  const hasQuickWins = quickWins && quickWins.length > 0;
  let quickWinsHtml = "";
  if (hasQuickWins) {
    for (const opt of quickWins!) {
      const _qwJson = escJson({ type: 'quick-win', url: opt.url, keywords: opt.keywords.slice(0,5).map(k => k.keyword), notes: opt.notes });
      quickWinsHtml += `
          <div class="opt-block qw-block cs-editable" data-cs-idx="${cardIdx++}" data-cs-json="${_qwJson}">
            <div class="cs-edit-bar">
              <button class="cs-edit-btn cs-del" onclick="deleteItem(this)">Remove</button>
              <button class="cs-edit-btn cs-regen" onclick="regenItem(this)">Suggest another</button>
            </div>
            <div class="opt-block-hdr">
              <div class="opt-block-url"><a href="https://${esc(opt.url)}" target="_blank" rel="noopener">${esc(opt.url)}</a></div>
            </div>
            <p class="opt-notes">${esc(opt.notes)}</p>
            <table class="kw-table">
              <thead><tr><th>Keyword</th><th>Monthly searches</th></tr></thead>
              <tbody>
                ${opt.keywords.map((k, i) => `<tr${i === 0 ? ' class="kw-top"' : ""}><td>${esc(k.keyword)}</td><td>${formatNum(k.volume)}</td></tr>`).join("\n                ")}
              </tbody>
            </table>
          </div>`;
    }
  }

  // ── Page optimisations HTML ──
  const sortedPageOpts = sortByImpact(pageOptimisations, 1000);
  let pageOptsHtml = "";
  for (const opt of sortedPageOpts) {
    const _optJson = escJson({ type: 'page-opt', url: opt.url, keywords: opt.keywords.slice(0,5).map(k => k.keyword), notes: opt.notes });
    pageOptsHtml += `
          <div class="opt-block cs-editable" data-cs-idx="${cardIdx++}" data-cs-json="${_optJson}">
            <div class="cs-edit-bar">
              <button class="cs-edit-btn cs-del" onclick="deleteItem(this)">Remove</button>
              <button class="cs-edit-btn cs-regen" onclick="regenItem(this)">Suggest another</button>
            </div>
            <div class="opt-block-hdr">
              <div class="opt-block-url"><a href="https://${esc(opt.url)}" target="_blank" rel="noopener">${esc(opt.url)}</a></div>
            </div>
            ${opt.notes ? `<p class="opt-notes">${esc(opt.notes)}</p>` : ""}
            <table class="kw-table">
              <thead><tr><th>Keyword</th><th>Monthly searches</th></tr></thead>
              <tbody>
                ${opt.keywords.map((k, i) => `<tr${i === 0 ? ' class="kw-top"' : ""}><td>${esc(k.keyword)}</td><td>${formatNum(k.volume)}</td></tr>`).join("\n                ")}
              </tbody>
            </table>
          </div>`;
  }

  // ── Landing pages HTML ──
  const allLandingPages = sortByImpact([...landingPages, ...categoryPages], 500);
  let landingPagesHtml = "";
  for (const page of allLandingPages) {
    const desc = aiContent[`landing_${page.title}`] || page.notes || "";
    const _lpJson = escJson({ type: 'landing', title: page.title, keywords: page.keywords.slice(0,5).map(k => k.keyword), notes: desc });
    landingPagesHtml += `
          <div class="new-page-card cs-editable" data-cs-idx="${cardIdx++}" data-cs-json="${_lpJson}">
            <div class="cs-edit-bar">
              <button class="cs-edit-btn cs-del" onclick="deleteItem(this)">Remove</button>
              <button class="cs-edit-btn cs-regen" onclick="regenItem(this)">Suggest another</button>
            </div>
            <div class="new-page-card-hdr">
              <div class="new-page-title">${esc(page.title)}</div>
            </div>
            <p class="new-page-desc">${esc(desc)}</p>
            <div class="new-page-kws">
              ${page.keywords.map(k => `<div class="kw-pill${k.volume >= 200 ? " kw-pill-high" : ""}">${esc(k.keyword)} <span>${formatNum(k.volume)}</span></div>`).join("\n              ")}
            </div>
          </div>`;
  }

  // ── Blog posts HTML — grouped by cluster ──
  const sortedBlogPosts = sortByImpact(blogPosts, 1000);
  // Group by cluster, ungrouped posts go under a default cluster
  const clusterMap = new Map<string, BlogPost[]>();
  for (const post of sortedBlogPosts) {
    const clusterKey = post.cluster?.trim() || "__ungrouped__";
    const group = clusterMap.get(clusterKey) ?? [];
    group.push(post);
    clusterMap.set(clusterKey, group);
  }
  // Move __ungrouped__ to end if there are real clusters
  const hasRealClusters = [...clusterMap.keys()].some(k => k !== "__ungrouped__");
  const clusterOrder = [...clusterMap.keys()].sort((a, b) => {
    if (a === "__ungrouped__") return 1;
    if (b === "__ungrouped__") return -1;
    return a.localeCompare(b);
  });

  let blogPostsHtml = "";
  let globalPostIdx = 0;
  for (const clusterKey of clusterOrder) {
    const clusterPosts = clusterMap.get(clusterKey)!;
    if (hasRealClusters && clusterKey !== "__ungrouped__") {
      blogPostsHtml += `\n          <div class="cluster-header">${esc(clusterKey)}</div>`;
    }
    for (const post of clusterPosts) {
      globalPostIdx++;
      const desc = aiContent[`blog_${post.title}`] || post.notes || "";
      const _blogJson = escJson({ type: 'blog', title: post.title, cluster: post.cluster || '', keywords: post.keywords.slice(0,5).map(k => k.keyword), notes: desc });
      blogPostsHtml += `
          <div class="blog-item cs-editable" data-cs-idx="${cardIdx++}" data-cs-json="${_blogJson}">
            <div class="cs-edit-bar">
              <button class="cs-edit-btn cs-del" onclick="deleteItem(this)">Remove</button>
              <button class="cs-edit-btn cs-regen" onclick="regenItem(this)">Suggest another</button>
            </div>
            <div class="blog-item-left">
              <div class="blog-num">${String(globalPostIdx).padStart(2, "0")}</div>
            </div>
            <div class="blog-item-body">
              <div class="blog-item-top">
                <div class="blog-title">${esc(post.title)}</div>
              </div>
              <p class="blog-desc">${esc(desc)}</p>
              <div class="blog-kw-row">
                ${post.keywords.map((k, j) => `<div class="blog-kw-item${j < 2 ? " top" : ""}">
                  <span class="bk-word">${esc(k.keyword)}</span>
                  <span class="bk-vol">${formatNum(k.volume)}</span>
                </div>`).join("\n                ")}
              </div>
            </div>
          </div>`;
    }
  }

  // Build link targets HTML
  let linkTargetsHtml = "";
  // Group by URL
  const linkGroups = new Map<string, LinkTarget[]>();
  for (const t of linkTargets) {
    const existing = linkGroups.get(t.url) || [];
    existing.push(t);
    linkGroups.set(t.url, existing);
  }
  let isFirst = true;
  for (const [url, targets] of linkGroups) {
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      const badgeClass = t.anchorType.toLowerCase() === "exact" ? "anchor-exact" : t.anchorType.toLowerCase() === "brand" ? "anchor-brand" : "anchor-broad";
      linkTargetsHtml += `
              <tr${!isFirst && i === 0 ? ' class="lt-sep"' : ""}>
                ${i === 0 ? `<td class="lt-url"${targets.length > 1 ? ` rowspan="${targets.length}"` : ""}><a href="https://${esc(url)}" target="_blank" rel="noopener">${esc(url)}</a></td>` : ""}
                <td>${esc(t.anchorKeyword)}</td>
                <td><span class="anchor-badge ${badgeClass}">${esc(t.anchorType)}</span></td>
              </tr>`;
    }
    isFirst = false;
  }

  // Find the top 4 unique keywords across all sections (for the summary bar)
  const allKeywords = [
    ...pageOptimisations.flatMap(p => p.keywords),
    ...allLandingPages.flatMap(p => p.keywords),
    ...blogPosts.flatMap(p => p.keywords),
  ];
  const bestByKeyword = new Map<string, { keyword: string; volume: number }>();
  for (const k of allKeywords) {
    const key = k.keyword.toLowerCase();
    const existing = bestByKeyword.get(key);
    if (!existing || k.volume > existing.volume) {
      bestByKeyword.set(key, { keyword: k.keyword, volume: k.volume });
    }
  }
  let totalDeduplicatedVol = 0;
  bestByKeyword.forEach(k => { totalDeduplicatedVol += k.volume; });
  const totalAnchorLinks = linkTargets.length;

  // Overview descriptions from AI
  const overviewOpportunity = aiContent.overviewOpportunity || "A comprehensive content strategy targeting high-value keyword opportunities.";
  const overviewPlan = aiContent.overviewPlan || "The strategy covers page optimisations, new landing pages, blog content, and link building, all delivered by i3media on your behalf.";
  const overviewPriority = aiContent.overviewPriority || "We'll focus on the highest-impact quick wins first, then build out the new content over the following months.";
  const overviewScope = aiContent.overviewScope || `We're targeting ${bestByKeyword.size} unique keywords across all content types.`;
  const sectionDescOpts = aiContent.sectionDescOpts || "These are existing pages on your site that we'll refresh and expand. Improving them strengthens rankings for terms they already appear for and opens up new keyword opportunities within the same topic cluster.";
  const sectionDescLanding = aiContent.sectionDescLanding || "New pages we will write and publish on your behalf. Each targets a keyword cluster not currently served by your existing content, turning search demand into enquiries.";
  const sectionDescBlog = aiContent.sectionDescBlog || "New informational articles we will research and write. These drive organic traffic at the top of the funnel, build topical authority, and internally link to your key commercial pages.";
  const sectionDescLinks = aiContent.sectionDescLinks || "These are the pages our outreach campaign will build backlinks towards. Earning links to these specific URLs strengthens their individual authority and improves the site's ability to rank competitively across the board.";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(clientName)}: Content Strategy | i3</title>
<style>
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --bg: #f1f5f9;
  --white: #ffffff;
  --border: #e2e8f0;
  --text: #1e293b;
  --muted: #64748b;
  --accent: #7c3aed;
  --accent-light: #ede9fe;
  --accent-dark: #5b21b6;
  --green: #059669;
  --green-light: #d1fae5;
  --amber: #d97706;
  --amber-light: #fef3c7;
  --blue: #2563eb;
  --blue-light: #dbeafe;
  --slate-tag: #475569;
  --slate-tag-light: #e2e8f0;
  --radius: 12px;
  --shadow: 0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04);
  --shadow-lg: 0 10px 25px rgba(0,0,0,.08);
}

body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; }

/* ─── HEADER ─── */
.header { position: sticky; top: 0; z-index: 100; background: #0f172a; padding: 0 2rem; display: flex; align-items: center; justify-content: space-between; height: 56px; border-bottom: 1px solid rgba(255,255,255,.08); }
.header-logo svg { display: block; }
.header-badge { font-size: .75rem; font-weight: 600; color: rgba(255,255,255,.65); background: rgba(255,255,255,.08); padding: .25rem .75rem; border-radius: 999px; letter-spacing: .02em; }

/* ─── HERO ─── */
.hero { background: linear-gradient(135deg, #0f172a 0%, #1e1035 50%, #2e1065 100%); padding: 4rem 2rem 3rem; color: #fff; position: relative; overflow: hidden; }
.hero::before { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 70% 20%, rgba(124,58,237,.25) 0%, transparent 60%); pointer-events: none; }
.hero-inner { max-width: 900px; margin: 0 auto; position: relative; z-index: 1; }
.hero-tag { display: inline-flex; align-items: center; gap: .5rem; font-size: .75rem; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; color: rgba(255,255,255,.7); margin-bottom: 1.25rem; }
.hero-tag .dot { width: 6px; height: 6px; border-radius: 50%; background: #a78bfa; animation: pulse 2s ease-in-out infinite; }
@keyframes pulse { 0%,100% { opacity: .5; } 50% { opacity: 1; } }
.hero h1 { font-size: 2.25rem; font-weight: 800; line-height: 1.2; margin-bottom: .75rem; }
.hero h1 .hl { color: #c4b5fd; }
.hero-sub { font-size: 1rem; color: rgba(255,255,255,.6); max-width: 600px; margin-bottom: 2rem; }
.hero-meta { display: flex; flex-wrap: wrap; gap: 1.5rem; margin-bottom: 2rem; }
.meta-item { display: flex; align-items: center; gap: .5rem; font-size: .8rem; color: rgba(255,255,255,.55); }
.meta-item strong { color: rgba(255,255,255,.9); font-weight: 600; }

/* stat row */
.stat-row { display: flex; flex-wrap: wrap; gap: 1rem; }
.stat-card { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.08); border-radius: var(--radius); padding: 1rem 1.25rem; min-width: 120px; display: inline-flex; flex-direction: column; }
.stat-num { font-size: 1.5rem; font-weight: 800; letter-spacing: -.02em; }
.stat-label { font-size: .7rem; text-transform: uppercase; letter-spacing: .06em; color: rgba(255,255,255,.5); margin-top: .15rem; }

/* ─── LAYOUT ─── */
.wrap { max-width: 1320px; margin: 0 auto; display: grid; grid-template-columns: 240px 1fr; gap: 2rem; padding: 2rem; }
@media (max-width: 900px) { .wrap { grid-template-columns: 1fr; } .sidebar { display: none; } }

/* ─── SIDEBAR ─── */
.sidebar { position: sticky; top: 80px; align-self: start; display: flex; flex-direction: column; gap: 1rem; }
.side-nav { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 1rem; }
.side-nav h3 { font-size: .65rem; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); margin-bottom: .75rem; }
.nav-link { display: block; padding: .45rem .75rem; font-size: .82rem; color: var(--muted); text-decoration: none; border-radius: 8px; transition: .15s; }
.nav-link:hover, .nav-link.active { background: var(--accent-light); color: var(--accent); font-weight: 600; }
.contact-card { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.25rem; text-align: center; }
.contact-card .cc-label { font-size: .65rem; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); margin-bottom: .35rem; }
.contact-card .cc-name { font-weight: 700; font-size: .95rem; margin-bottom: .85rem; }
.contact-card .cc-btn { display: inline-block; padding: .5rem 1.25rem; font-size: .8rem; font-weight: 600; color: #fff; background: var(--accent); border-radius: 999px; text-decoration: none; transition: .15s; }
.contact-card .cc-btn:hover { background: var(--accent-dark); }

/* ─── SECTIONS ─── */
main { min-width: 0; display: flex; flex-direction: column; gap: 2rem; }
.section { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; box-shadow: var(--shadow); }
.section-hdr { padding: 1.75rem 2rem 1.25rem; border-bottom: 1px solid var(--border); }
.section-tag { display: inline-block; font-size: .65rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; padding: .2rem .6rem; border-radius: 4px; margin-bottom: .5rem; }
.tag-purple { background: var(--accent-light); color: var(--accent); }
.tag-blue { background: var(--blue-light); color: var(--blue); }
.tag-green { background: var(--green-light); color: var(--green); }
.tag-amber { background: var(--amber-light); color: var(--amber); }
.tag-slate { background: var(--slate-tag-light); color: var(--slate-tag); }
.section-hdr h2 { font-size: 1.35rem; font-weight: 800; margin-bottom: .35rem; }
.section-hdr p { font-size: .88rem; color: var(--muted); max-width: 640px; }
.section-body { padding: 1.5rem 2rem 2rem; }

/* -- Overview -- */
.intro-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
.intro-card { background: var(--bg); border-radius: var(--radius); padding: 1.25rem; }
.intro-card h4 { font-size: .75rem; text-transform: uppercase; letter-spacing: .04em; color: var(--accent); margin-bottom: .35rem; }
.intro-card p { font-size: .85rem; color: var(--muted); }
.kw-summary { background: #0f172a; border-radius: 10px; padding: 1.4rem 1.75rem; display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.25rem; text-align: center; }
.kw-summary-num { font-size: 2rem; font-weight: 800; color: #fff; line-height: 1; margin-bottom: .3rem; }
.kw-summary-num span { color: #c4b5fd; }
.kw-summary-lbl { font-size: 11px; color: rgba(255,255,255,.4); line-height: 1.4; }

/* -- Optimisation blocks -- */
.opt-table-wrap { display: flex; flex-direction: column; gap: 1.25rem; }
.opt-block { border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
.opt-block-hdr { display: flex; align-items: flex-start; justify-content: space-between; gap: .5rem; background: var(--bg); padding: .75rem 1rem; flex-wrap: wrap; }
.opt-block-url { font-size: .82rem; font-weight: 600; }
.opt-block-url a { color: var(--text); text-decoration: none; }
.opt-block-url a:hover { color: var(--accent); }
.opt-notes { font-size: .8rem; color: var(--muted); padding: .5rem 1rem; border-bottom: 1px solid #f1f5f9; background: #fff; }
.qw-block { border-color: #a7f3d0; }
.qw-block .opt-block-hdr { background: #f0fdf4; }
.kw-table { width: 100%; border-collapse: collapse; font-size: .82rem; }
.kw-table th { text-align: left; padding: .55rem 1rem; background: #f8fafc; color: var(--muted); font-weight: 600; font-size: .7rem; text-transform: uppercase; letter-spacing: .04em; border-bottom: 1px solid var(--border); }
.kw-table th:last-child { text-align: right; }
.kw-table td { padding: .5rem 1rem; border-bottom: 1px solid #f1f5f9; }
.kw-table td:last-child { text-align: right; color: var(--muted); font-variant-numeric: tabular-nums; }
.kw-table tr:last-child td { border-bottom: none; }
.kw-table tbody tr:hover { background: #fafbff; }
.kw-top td { font-weight: 700; background: #fafafa; }
.kw-top td:last-child { color: var(--accent); }

/* -- New page cards -- */
.new-pages-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
@media (max-width: 700px) { .new-pages-grid { grid-template-columns: 1fr; } }
.new-page-card { border: 1px solid var(--border); border-radius: var(--radius); padding: 1.25rem; transition: .15s; }
.new-page-card:hover { box-shadow: var(--shadow-lg); }
.new-page-card-hdr { margin-bottom: .5rem; }
.new-page-title { font-weight: 700; font-size: .95rem; }
.new-page-desc { font-size: .82rem; color: var(--muted); margin-bottom: .75rem; }
.new-page-kws { display: flex; flex-wrap: wrap; gap: .35rem; }
.kw-pill { font-size: .7rem; background: var(--bg); border: 1px solid var(--border); padding: .2rem .55rem; border-radius: 999px; white-space: nowrap; }
.kw-pill span { font-weight: 700; margin-left: .25rem; color: var(--accent); }
.kw-pill-high { background: var(--accent-light); border-color: #c4b5fd; }

/* -- Blog list -- */
.blog-list { display: flex; flex-direction: column; gap: 1rem; }
.cluster-header { font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--accent); padding: .5rem 0 .25rem; border-bottom: 2px solid var(--accent-light); margin-bottom: .25rem; }
.blog-item { display: flex; gap: 1.25rem; border: 1px solid var(--border); border-radius: var(--radius); padding: 1.25rem; transition: .15s; }
.blog-item:hover { box-shadow: var(--shadow-lg); }
.blog-item-left { flex-shrink: 0; display: flex; align-items: start; }
.blog-num { font-size: 1.5rem; font-weight: 900; color: var(--border); line-height: 1; }
.blog-item-body { flex: 1; min-width: 0; }
.blog-item-top { margin-bottom: .35rem; }
.blog-title { font-weight: 700; font-size: .95rem; }
.blog-desc { font-size: .82rem; color: var(--muted); margin-bottom: .75rem; }
.blog-kw-row { display: flex; flex-wrap: wrap; gap: .5rem; }
.blog-kw-item { display: flex; align-items: center; gap: .35rem; font-size: .75rem; background: var(--bg); border: 1px solid var(--border); padding: .25rem .6rem; border-radius: 8px; }
.blog-kw-item.top { background: var(--accent-light); border-color: #c4b5fd; }
.bk-word { color: var(--text); }
.bk-vol { font-weight: 700; color: var(--accent); }

/* -- Link table -- */
.link-table-wrap { overflow-x: auto; }
.link-table { width: 100%; border-collapse: collapse; font-size: .82rem; }
.link-table th { text-align: left; padding: .65rem 1rem; background: #f8fafc; color: var(--muted); font-weight: 600; font-size: .7rem; text-transform: uppercase; letter-spacing: .04em; border-bottom: 1px solid var(--border); }
.link-table td { padding: .55rem 1rem; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
.lt-url { font-weight: 600; }
.lt-url a { color: var(--text); text-decoration: none; }
.lt-url a:hover { color: var(--accent); }
.lt-sep td { border-top: 2px solid var(--border); }
.anchor-badge { display: inline-block; font-size: .65rem; font-weight: 600; padding: .15rem .5rem; border-radius: 4px; }
.anchor-exact { background: var(--accent-light); color: var(--accent); }
.anchor-broad { background: var(--blue-light); color: var(--blue); }
.anchor-brand { background: var(--green-light); color: var(--green); }

/* -- Roadmap -- */
.roadmap-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; }
@media (max-width: 760px) { .roadmap-grid { grid-template-columns: 1fr; } }
.roadmap-col { border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
.roadmap-col-hdr { padding: .65rem 1rem; font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
.roadmap-col-hdr.hdr-green { background: #f0fdf4; color: #166534; border-bottom: 2px solid #a7f3d0; }
.roadmap-col-hdr.hdr-blue { background: #eff6ff; color: #1e40af; border-bottom: 2px solid #bfdbfe; }
.roadmap-col-hdr.hdr-purple { background: var(--accent-light); color: var(--accent-dark); border-bottom: 2px solid #c4b5fd; }
.roadmap-items { padding: .75rem 1rem; display: flex; flex-direction: column; gap: .5rem; }
.roadmap-item { font-size: .82rem; color: var(--text); padding: .5rem .75rem; background: var(--bg); border-radius: 6px; border-left: 3px solid var(--border); line-height: 1.4; }

/* ── Card editing ── */
.cs-editable { position: relative; }
.cs-edit-bar { position: absolute; top: 6px; right: 6px; display: flex; gap: 4px; opacity: 0; transition: opacity .12s; z-index: 10; pointer-events: none; }
.cs-editable:hover .cs-edit-bar { opacity: 1; pointer-events: auto; }
.cs-edit-btn { font-size: .65rem; font-weight: 700; padding: .3rem .65rem; border-radius: 5px; border: 1px solid; cursor: pointer; line-height: 1; white-space: nowrap; font-family: inherit; }
.cs-del { background: #fff; color: #ef4444; border-color: #fca5a5; }
.cs-del:hover { background: #fee2e2; }
.cs-regen { background: #fff; color: var(--accent); border-color: #c4b5fd; }
.cs-regen:hover { background: var(--accent-light); }
.cs-regen:disabled { opacity: .5; cursor: default; }
#cs-action-bar { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: #1e293b; color: #fff; border-radius: 999px; padding: 8px 10px 8px 16px; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 24px rgba(0,0,0,.4); z-index: 1000; opacity: 0; pointer-events: none; transition: opacity .2s; white-space: nowrap; }
#cs-action-bar.cs-bar-visible { opacity: 1; pointer-events: auto; }
.cs-action-btn { font-size: .75rem; font-weight: 700; padding: .35rem .9rem; border-radius: 999px; border: none; cursor: pointer; background: rgba(255,255,255,.15); color: #fff; transition: background .1s; font-family: inherit; }
.cs-action-btn:hover { background: rgba(255,255,255,.25); }
.cs-action-btn:disabled { opacity: .4; cursor: default; pointer-events: none; }
.cs-save-style { background: var(--accent); }
.cs-save-style:hover { background: var(--accent-dark); }
.cs-add-wrap { margin-top: 1rem; }
.cs-add-btn { font-size: .75rem; font-weight: 600; padding: .5rem 1.25rem; border-radius: 8px; border: 1.5px dashed var(--border); background: transparent; color: var(--muted); cursor: pointer; font-family: inherit; transition: .12s; }
.cs-add-btn:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-light); }
.cs-add-btn:disabled { opacity: .45; cursor: default; }
.roadmap-col.col-green .roadmap-item { border-left-color: #4ade80; }
.roadmap-col.col-blue .roadmap-item { border-left-color: #60a5fa; }
.roadmap-col.col-purple .roadmap-item { border-left-color: #a78bfa; }

/* -- Link note -- */
.link-note { display: flex; gap: .75rem; background: var(--bg); border-radius: var(--radius); padding: 1rem 1.25rem; margin-top: 1.25rem; font-size: .82rem; color: var(--muted); }
.link-note-icon { font-size: 1.1rem; flex-shrink: 0; }

/* -- Footer CTA -- */
.footer-cta { margin-top: 1rem; text-align: center; padding: 2.5rem 1rem 1rem; }
.footer-cta-inner { display: inline-flex; align-items: center; gap: 1rem; }
.footer-cta-logo svg { display: block; opacity: .35; }
.footer-small { margin-top: 1rem; font-size: .7rem; color: var(--muted); }
</style>
</head>
<body>

<div class="header">
  <div class="header-logo">
    <svg viewBox="0 0 161 53" fill="none" xmlns="http://www.w3.org/2000/svg" height="26">
      <path d="M26.0013 0.853516C11.6413 0.853516 0 12.4947 0 26.8538C0 41.2136 11.6413 52.8535 26.0013 52.8535C40.362 52.8535 52.0033 41.2136 52.0033 26.8538C52.0033 12.4947 40.362 0.853516 26.0013 0.853516ZM17.6309 21.0628C18.8643 21.0598 19.8647 22.0577 19.8702 23.2935C19.8781 24.5225 18.8722 25.5247 17.6467 25.5247C16.4078 25.5278 15.4074 24.5353 15.4074 23.3044C15.3995 22.0711 16.3944 21.0683 17.6309 21.0628ZM40.3455 21.0598C39.7898 24.7824 38.4423 31.4889 38.4423 31.4889C38.4423 31.4889 37.7451 35.841 31.3004 35.8569C24.8539 35.8734 20.019 35.8868 20.019 35.8868C20.019 35.8868 19.5475 39.9833 13.7805 39.9943L16.6787 29.1662C16.6787 29.1662 17.5491 26.2896 22.5536 26.0804L21.2305 31.1638L31.1424 31.1394C31.1424 31.1394 33.5287 30.6783 33.7209 28.5477L23.2106 28.5776C23.2106 28.5776 23.7962 24.8281 28.1717 24.0773L33.6215 24.0584C33.6215 24.0584 34.8195 23.7192 34.8146 22.811V22.2443C34.8146 22.2443 34.7817 21.6155 33.9008 21.3337L23.6742 21.3666C23.6742 21.3666 20.3234 21.5453 20.307 16.6571L36.4439 16.6083C36.4439 16.6083 40.9067 17.3353 40.3455 21.0598Z" fill="white"/>
      <path d="M144.133 35.8645L149.848 19.3218H154.486L160.201 35.8645H156.742L152.355 21.8533H152.004L147.567 35.8645H144.133ZM147.166 32.4557V30.225H157.594V32.4557H147.166Z" fill="white"/>
      <path d="M138.913 35.8645V19.3218H142.122V35.8645H138.913Z" fill="white"/>
      <path d="M123.563 35.8645V33.2578H128.401C129.403 33.2578 130.231 33.0322 130.882 32.581C131.551 32.1299 132.044 31.4866 132.361 30.6511C132.696 29.8156 132.863 28.813 132.863 27.6433C132.863 26.6574 132.754 25.8052 132.537 25.0867C132.336 24.3682 132.027 23.7833 131.609 23.3321C131.192 22.8643 130.665 22.5134 130.03 22.2794C129.395 22.0455 128.651 21.9285 127.799 21.9285H123.563V19.3218H127.699C129.654 19.3218 131.25 19.6476 132.487 20.2993C133.74 20.951 134.659 21.8867 135.244 23.1066C135.846 24.3097 136.147 25.7634 136.147 27.4678C136.147 28.6709 136.005 29.7404 135.721 30.6761C135.436 31.5952 135.052 32.3889 134.567 33.0573C134.083 33.709 133.515 34.2437 132.863 34.6614C132.211 35.0792 131.509 35.3883 130.757 35.5888C130.022 35.7726 129.261 35.8645 128.476 35.8645H123.563ZM122.008 35.8645V19.3218H125.167V35.8645H122.008Z" fill="white"/>
      <path d="M107.208 35.8645V19.3218H110.392V35.8645H107.208ZM109.264 35.8645V33.2578H119.567V35.8645H109.264ZM109.264 28.6709V26.2647H118.338V28.6709H109.264ZM109.264 21.9285V19.3218H119.517V21.9285H109.264Z" fill="white"/>
      <path d="M84.55 35.8645V19.3218H89.338L94.2514 32.3304H94.3767L99.2149 19.3218H103.802V35.8645H100.794L100.995 22.5301H100.744L95.5048 35.8645H92.7473L87.5833 22.5301H87.3326L87.5331 35.8645H84.55Z" fill="white"/>
      <path d="M75.2092 36.2156C74.1396 36.2156 73.2121 36.0986 72.4266 35.8647C71.6412 35.6475 70.981 35.3383 70.4462 34.9373C69.9282 34.5196 69.5271 34.0099 69.243 33.4084C68.9589 32.8068 68.7834 32.1384 68.7166 31.4032L71.6244 30.5008C71.6412 31.0857 71.7498 31.5786 71.9503 31.9797C72.1509 32.3807 72.4183 32.7149 72.7525 32.9822C73.0868 33.2329 73.4711 33.4167 73.9056 33.5337C74.3402 33.6506 74.7914 33.7091 75.2593 33.7091C75.9445 33.7091 76.5545 33.6172 77.0893 33.4334C77.6241 33.2329 78.0502 32.9321 78.3678 32.5311C78.6853 32.1133 78.8441 31.5786 78.8441 30.9269C78.8441 30.1249 78.5767 29.4815 78.0419 28.9969C77.5238 28.4957 76.7634 28.1531 75.7607 27.9693C74.758 27.7855 73.538 27.7437 72.1007 27.844V25.9641L77.7661 22.054V21.8535L69.4937 21.9036V19.2969H80.9498V22.3798L75.6604 26.1396V26.3651C77.2313 26.2983 78.4764 26.4738 79.3956 26.8915C80.3147 27.3093 80.9748 27.8774 81.3759 28.5959C81.777 29.3144 81.9776 30.1165 81.9776 31.0021C81.9776 32.0549 81.7269 32.9739 81.2255 33.7593C80.7409 34.5446 79.9972 35.1545 78.9945 35.589C77.9917 36.0067 76.73 36.2156 75.2092 36.2156Z" fill="white"/>
      <path d="M63.6388 35.8647V22.7558H66.797V35.8647H63.6388ZM65.2179 20.7005C64.5829 20.7005 64.09 20.5668 63.7391 20.2994C63.4049 20.0154 63.2378 19.6143 63.2378 19.0963C63.2378 18.5783 63.4049 18.1856 63.7391 17.9183C64.09 17.6342 64.5829 17.4922 65.2179 17.4922C65.8863 17.4922 66.3876 17.6259 66.7218 17.8932C67.056 18.1606 67.2231 18.5616 67.2231 19.0963C67.2231 19.6143 67.0476 20.0154 66.6967 20.2994C66.3625 20.5668 65.8696 20.7005 65.2179 20.7005Z" fill="white"/>
    </svg>
  </div>
  <div class="header-badge">Content Strategy</div>
</div>

<div class="hero">
  <div class="hero-inner">
    <div class="hero-tag"><span class="dot"></span> Content Strategy</div>
    <h1>Content Strategy for <span class="hl">${esc(clientName)}</span></h1>
    <p class="hero-sub">A data-led content plan designed to grow organic visibility, capture high-intent search traffic, and support wider marketing goals.</p>
    <div class="hero-meta">
      <div class="meta-item"><strong>Client</strong> ${esc(clientName)}</div>
      <div class="meta-item"><strong>Prepared&nbsp;by</strong> i3MEDIA</div>
      <div class="meta-item"><strong>Period</strong> ${esc(period)}</div>
    </div>
    <div class="stat-row">
      ${stats.totalPageOptimisations > 0 ? `<div class="stat-card"><div class="stat-num">${stats.totalPageOptimisations}</div><div class="stat-label">Page optimisations</div></div>` : ''}
      ${stats.totalLandingPages > 0 ? `<div class="stat-card"><div class="stat-num">${stats.totalLandingPages}</div><div class="stat-label">New landing pages</div></div>` : ''}
      ${stats.totalBlogPosts > 0 ? `<div class="stat-card"><div class="stat-num">${stats.totalBlogPosts}</div><div class="stat-label">Blog posts</div></div>` : ''}
      ${totalAnchorLinks > 0 ? `<div class="stat-card"><div class="stat-num">${totalAnchorLinks}</div><div class="stat-label">Link building targets</div></div>` : ''}
    </div>
  </div>
</div>

<div class="wrap">
  <aside class="sidebar">
    <nav class="side-nav">
      <h3>On this page</h3>
      <a class="nav-link active" href="#overview">Overview</a>
      ${hasQuickWins ? '<a class="nav-link" href="#quick-wins">Quick Wins</a>' : ""}
      ${stats.totalPageOptimisations > 0 ? '<a class="nav-link" href="#page-optimisations">Page Optimisations</a>' : ""}
      ${stats.totalLandingPages > 0 ? '<a class="nav-link" href="#landing-pages">New Landing Pages</a>' : ""}
      ${stats.totalBlogPosts > 0 ? '<a class="nav-link" href="#blog-pages">Blog Posts</a>' : ""}
      ${linkTargets.length > 0 ? '<a class="nav-link" href="#link-targets">Link Building</a>' : ""}
      ${roadmap && (roadmap.month1.length > 0 || roadmap.months2to3.length > 0 || roadmap.months4plus.length > 0) ? '<a class="nav-link" href="#roadmap">Delivery Roadmap</a>' : ""}
    </nav>
  </aside>

  <main>
    <!-- OVERVIEW -->
    <div class="section" id="overview">
      <div class="section-hdr">
        <span class="section-tag tag-purple">Strategy overview</span>
        <h2>Overview</h2>
        <p>A breakdown of the key areas this strategy addresses and how they connect.</p>
      </div>
      <div class="section-body">
        <div class="intro-grid">
          <div class="intro-card"><h4>Opportunity</h4><p>${esc(overviewOpportunity)}</p></div>
          <div class="intro-card"><h4>Plan structure</h4><p>${esc(overviewPlan)}</p></div>
          <div class="intro-card"><h4>Priority period</h4><p>${esc(overviewPriority)}</p></div>
          <div class="intro-card"><h4>Keyword scope</h4><p>${esc(overviewScope)}</p></div>
        </div>
        ${totalDeduplicatedVol > 0 ? `<div class="kw-summary" style="grid-template-columns:1fr">
          <div class="kw-summary-item">
            <div class="kw-summary-num"><span>${formatNum(totalDeduplicatedVol)}</span></div>
            <div class="kw-summary-lbl">Total monthly searches across all keywords</div>
          </div>
        </div>` : ''}
      </div>
    </div>

    ${hasQuickWins ? `
    <!-- QUICK WINS -->
    <div class="section" id="quick-wins">
      <div class="section-hdr">
        <span class="section-tag tag-green">Fast results</span>
        <h2>Quick Wins</h2>
        <p>These pages already rank on page 1 or 2 for keywords with real search volume. Small content improvements (a tightened title tag, an added FAQ section, a clearer call to action) can push them to the top 3 and deliver traffic gains quickly.</p>
      </div>
      <div class="section-body">
        <div class="opt-table-wrap" data-cs-section="quick-win">
          ${quickWinsHtml}
        </div>
        <div class="cs-add-wrap"><button class="cs-add-btn" data-cs-section="quick-win" onclick="addToSection(this)">+ Add another</button></div>
      </div>
    </div>` : ""}

    ${stats.totalPageOptimisations > 0 ? `
    <!-- PAGE OPTIMISATIONS -->
    <div class="section" id="page-optimisations">
      <div class="section-hdr">
        <span class="section-tag tag-blue">Existing content</span>
        <h2>Page Optimisations</h2>
        <p>${sectionDescOpts}</p>
      </div>
      <div class="section-body">
        <div class="opt-table-wrap" data-cs-section="page-opt">
          ${pageOptsHtml}
        </div>
        <div class="cs-add-wrap"><button class="cs-add-btn" data-cs-section="page-opt" onclick="addToSection(this)">+ Add another</button></div>
      </div>
    </div>` : ""}

    ${stats.totalLandingPages > 0 ? `
    <!-- NEW LANDING PAGES -->
    <div class="section" id="landing-pages">
      <div class="section-hdr">
        <span class="section-tag tag-green">New content</span>
        <h2>Proposed Landing Pages</h2>
        <p>${sectionDescLanding}</p>
      </div>
      <div class="section-body">
        <div class="new-pages-grid" data-cs-section="landing">
          ${landingPagesHtml}
        </div>
        <div class="cs-add-wrap"><button class="cs-add-btn" data-cs-section="landing" onclick="addToSection(this)">+ Add another</button></div>
      </div>
    </div>` : ""}

    ${stats.totalBlogPosts > 0 ? `
    <!-- BLOG POSTS -->
    <div class="section" id="blog-pages">
      <div class="section-hdr">
        <span class="section-tag tag-amber">Blog content</span>
        <h2>Proposed Blog Posts</h2>
        <p>${sectionDescBlog}</p>
      </div>
      <div class="section-body">
        <div class="blog-list" data-cs-section="blog">
          ${blogPostsHtml}
        </div>
        <div class="cs-add-wrap"><button class="cs-add-btn" data-cs-section="blog" onclick="addToSection(this)">+ Add another</button></div>
      </div>
    </div>` : ""}

    ${linkTargets.length > 0 ? `
    <!-- LINK TARGETS -->
    <div class="section" id="link-targets">
      <div class="section-hdr">
        <span class="section-tag tag-slate">Link building</span>
        <h2>Link Building Targets</h2>
        <p>${sectionDescLinks}</p>
      </div>
      <div class="section-body">
        <div class="link-table-wrap">
          <table class="link-table">
            <thead>
              <tr>
                <th>Target page</th>
                <th>Anchor text</th>
                <th>Anchor type</th>
              </tr>
            </thead>
            <tbody>
              ${linkTargetsHtml}
            </tbody>
          </table>
        </div>
        ${(() => { const types = new Set(linkTargets.map(t => t.anchorType.toLowerCase())); return types.size > 1 || !types.has('exact') ? `<div class="link-note"><div class="link-note-icon">&#9432;</div><p>We will vary anchor text across placements. Not every link will use an exact match anchor. In practice we aim for roughly 30% exact, 50% broad/natural, and 20% brand anchors across the total backlink profile for each page.</p></div>` : ''; })()}
      </div>
    </div>` : ""}

    ${roadmap && (roadmap.month1.length > 0 || roadmap.months2to3.length > 0 || roadmap.months4plus.length > 0) ? `
    <!-- DELIVERY ROADMAP -->
    <div class="section" id="roadmap">
      <div class="section-hdr">
        <span class="section-tag tag-purple">Delivery plan</span>
        <h2>Delivery Roadmap</h2>
        <p>How we'll sequence the work across the retainer. Quick wins and high-impact, low-effort tasks come first, so you see results early while we build out the deeper content programme.</p>
      </div>
      <div class="section-body">
        <div class="roadmap-grid">
          <div class="roadmap-col col-green">
            <div class="roadmap-col-hdr hdr-green">Phase 1: Quick Wins</div>
            <div class="roadmap-items">
              ${(roadmap.month1).map(item => `<div class="roadmap-item">${esc(item)}</div>`).join("\n              ")}
              ${roadmap.month1.length === 0 ? '<div class="roadmap-item" style="color:var(--muted)">To be confirmed</div>' : ""}
            </div>
          </div>
          <div class="roadmap-col col-blue">
            <div class="roadmap-col-hdr hdr-blue">Phase 2: Core Build</div>
            <div class="roadmap-items">
              ${(roadmap.months2to3).map(item => `<div class="roadmap-item">${esc(item)}</div>`).join("\n              ")}
              ${roadmap.months2to3.length === 0 ? '<div class="roadmap-item" style="color:var(--muted)">To be confirmed</div>' : ""}
            </div>
          </div>
          <div class="roadmap-col col-purple">
            <div class="roadmap-col-hdr hdr-purple">Phase 3: Authority</div>
            <div class="roadmap-items">
              ${(roadmap.months4plus).map(item => `<div class="roadmap-item">${esc(item)}</div>`).join("\n              ")}
              ${roadmap.months4plus.length === 0 ? '<div class="roadmap-item" style="color:var(--muted)">To be confirmed</div>' : ""}
            </div>
          </div>
        </div>
      </div>
    </div>` : ""}

    <!-- FOOTER CTA -->
    <div id="cs-action-bar">
      <span style="font-size:.72rem;opacity:.6">Unsaved edits</span>
      <button id="cs-undo-btn" class="cs-action-btn" onclick="undoDelete()" disabled>&#8629; Undo</button>
      <button id="cs-save-btn" class="cs-action-btn cs-save-style" onclick="saveStrategy()">Save changes</button>
    </div>

    <!-- FOOTER CTA -->
    <div class="footer-cta">
      <div class="footer-cta-inner">
        <div class="footer-cta-logo">
          <svg viewBox="0 0 161 53" fill="none" xmlns="http://www.w3.org/2000/svg" height="24">
            <path d="M26.0013 0.853516C11.6413 0.853516 0 12.4947 0 26.8538C0 41.2136 11.6413 52.8535 26.0013 52.8535C40.362 52.8535 52.0033 41.2136 52.0033 26.8538C52.0033 12.4947 40.362 0.853516 26.0013 0.853516ZM17.6309 21.0628C18.8643 21.0598 19.8647 22.0577 19.8702 23.2935C19.8781 24.5225 18.8722 25.5247 17.6467 25.5247C16.4078 25.5278 15.4074 24.5353 15.4074 23.3044C15.3995 22.0711 16.3944 21.0683 17.6309 21.0628ZM40.3455 21.0598C39.7898 24.7824 38.4423 31.4889 38.4423 31.4889C38.4423 31.4889 37.7451 35.841 31.3004 35.8569C24.8539 35.8734 20.019 35.8868 20.019 35.8868C20.019 35.8868 19.5475 39.9833 13.7805 39.9943L16.6787 29.1662C16.6787 29.1662 17.5491 26.2896 22.5536 26.0804L21.2305 31.1638L31.1424 31.1394C31.1424 31.1394 33.5287 30.6783 33.7209 28.5477L23.2106 28.5776C23.2106 28.5776 23.7962 24.8281 28.1717 24.0773L33.6215 24.0584C33.6215 24.0584 34.8195 23.7192 34.8146 22.811V22.2443C34.8146 22.2443 34.7817 21.6155 33.9008 21.3337L23.6742 21.3666C23.6742 21.3666 20.3234 21.5453 20.307 16.6571L36.4439 16.6083C36.4439 16.6083 40.9067 17.3353 40.3455 21.0598Z" fill="white"/>
            <path d="M144.133 35.8645L149.848 19.3218H154.486L160.201 35.8645H156.742L152.355 21.8533H152.004L147.567 35.8645H144.133ZM147.166 32.4557V30.225H157.594V32.4557H147.166Z" fill="white"/>
            <path d="M138.913 35.8645V19.3218H142.122V35.8645H138.913Z" fill="white"/>
            <path d="M123.563 35.8645V33.2578H128.401C129.403 33.2578 130.231 33.0322 130.882 32.581C131.551 32.1299 132.044 31.4866 132.361 30.6511C132.696 29.8156 132.863 28.813 132.863 27.6433C132.863 26.6574 132.754 25.8052 132.537 25.0867C132.336 24.3682 132.027 23.7833 131.609 23.3321C131.192 22.8643 130.665 22.5134 130.03 22.2794C129.395 22.0455 128.651 21.9285 127.799 21.9285H123.563V19.3218H127.699C129.654 19.3218 131.25 19.6476 132.487 20.2993C133.74 20.951 134.659 21.8867 135.244 23.1066C135.846 24.3097 136.147 25.7634 136.147 27.4678C136.147 28.6709 136.005 29.7404 135.721 30.6761C135.436 31.5952 135.052 32.3889 134.567 33.0573C134.083 33.709 133.515 34.2437 132.863 34.6614C132.211 35.0792 131.509 35.3883 130.757 35.5888C130.022 35.7726 129.261 35.8645 128.476 35.8645H123.563ZM122.008 35.8645V19.3218H125.167V35.8645H122.008Z" fill="white"/>
            <path d="M107.208 35.8645V19.3218H110.392V35.8645H107.208ZM109.264 35.8645V33.2578H119.567V35.8645H109.264ZM109.264 28.6709V26.2647H118.338V28.6709H109.264ZM109.264 21.9285V19.3218H119.517V21.9285H109.264Z" fill="white"/>
            <path d="M84.55 35.8645V19.3218H89.338L94.2514 32.3304H94.3767L99.2149 19.3218H103.802V35.8645H100.794L100.995 22.5301H100.744L95.5048 35.8645H92.7473L87.5833 22.5301H87.3326L87.5331 35.8645H84.55Z" fill="white"/>
            <path d="M75.2092 36.2156C74.1396 36.2156 73.2121 36.0986 72.4266 35.8647C71.6412 35.6475 70.981 35.3383 70.4462 34.9373C69.9282 34.5196 69.5271 34.0099 69.243 33.4084C68.9589 32.8068 68.7834 32.1384 68.7166 31.4032L71.6244 30.5008C71.6412 31.0857 71.7498 31.5786 71.9503 31.9797C72.1509 32.3807 72.4183 32.7149 72.7525 32.9822C73.0868 33.2329 73.4711 33.4167 73.9056 33.5337C74.3402 33.6506 74.7914 33.7091 75.2593 33.7091C75.9445 33.7091 76.5545 33.6172 77.0893 33.4334C77.6241 33.2329 78.0502 32.9321 78.3678 32.5311C78.6853 32.1133 78.8441 31.5786 78.8441 30.9269C78.8441 30.1249 78.5767 29.4815 78.0419 28.9969C77.5238 28.4957 76.7634 28.1531 75.7607 27.9693C74.758 27.7855 73.538 27.7437 72.1007 27.844V25.9641L77.7661 22.054V21.8535L69.4937 21.9036V19.2969H80.9498V22.3798L75.6604 26.1396V26.3651C77.2313 26.2983 78.4764 26.4738 79.3956 26.8915C80.3147 27.3093 80.9748 27.8774 81.3759 28.5959C81.777 29.3144 81.9776 30.1165 81.9776 31.0021C81.9776 32.0549 81.7269 32.9739 81.2255 33.7593C80.7409 34.5446 79.9972 35.1545 78.9945 35.589C77.9917 36.0067 76.73 36.2156 75.2092 36.2156Z" fill="white"/>
            <path d="M63.6388 35.8647V22.7558H66.797V35.8647H63.6388ZM65.2179 20.7005C64.5829 20.7005 64.09 20.5668 63.7391 20.2994C63.4049 20.0154 63.2378 19.6143 63.2378 19.0963C63.2378 18.5783 63.4049 18.1856 63.7391 17.9183C64.09 17.6342 64.5829 17.4922 65.2179 17.4922C65.8863 17.4922 66.3876 17.6259 66.7218 17.8932C67.056 18.1606 67.2231 18.5616 67.2231 19.0963C67.2231 19.6143 67.0476 20.0154 66.6967 20.2994C66.3625 20.5668 65.8696 20.7005 65.2179 20.7005Z" fill="white"/>
          </svg>
        </div>
      </div>
      <div class="footer-small">Prepared by i3MEDIA &nbsp;&middot;&nbsp; ${esc(period)} &nbsp;&middot;&nbsp; Confidential, for ${esc(clientName)} internal use only</div>
    </div>
  </main>
</div>

<script>
const CS_STRATEGY_ID = '__CS_ID__';
const navLinks = document.querySelectorAll('.nav-link');
const sectionIds = ['overview','quick-wins','page-optimisations','landing-pages','blog-pages','link-targets','roadmap'];
function setActive(id) {
  navLinks.forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === '#' + id);
  });
}
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) setActive(entry.target.id);
  });
}, { rootMargin: '-58px 0px -55% 0px', threshold: 0 });
sectionIds.forEach(id => {
  const el = document.getElementById(id);
  if (el) observer.observe(el);
});

// ── Inline editing ──────────────────────────────────────────────────────────
// Each entry is one of:
//   { kind:'del',   parent, nextSib, el, removeTimer }  — card removed
//   { kind:'regen', card, descEl, oldText, oldJson }    — description replaced
//   { kind:'add',   el }                                — card added
const _undoStack = [];

function _updateActionBar() {
  const bar = document.getElementById('cs-action-bar');
  const undoBtn = document.getElementById('cs-undo-btn');
  if (undoBtn) undoBtn.disabled = _undoStack.length === 0;
  if (bar) bar.classList.toggle('cs-bar-visible', _undoStack.length > 0);
}

function deleteItem(btn) {
  const card = btn.closest('[data-cs-idx]');
  if (!card) return;
  const entry = { kind: 'del', parent: card.parentNode, nextSib: card.nextSibling, el: card, removeTimer: null };
  _undoStack.push(entry);
  _updateActionBar(); // show bar + enable undo immediately
  card.style.transition = 'opacity .2s, transform .2s';
  card.style.opacity = '0';
  card.style.transform = 'scale(0.97)';
  entry.removeTimer = setTimeout(function() { entry.removeTimer = null; card.remove(); }, 200);
}

function undoDelete() {
  const last = _undoStack.pop();
  if (!last) return;
  if (last.kind === 'del') {
    if (last.removeTimer) { clearTimeout(last.removeTimer); last.removeTimer = null; }
    last.el.style.transition = '';
    last.el.style.opacity = '1';
    last.el.style.transform = '';
    if (!last.el.parentNode) last.parent.insertBefore(last.el, last.nextSib);
  } else if (last.kind === 'regen') {
    last.descEl.textContent = last.oldText;
    last.card.dataset.csJson = last.oldJson;
  } else if (last.kind === 'add') {
    last.el.remove();
  }
  _updateActionBar();
}

function regenItem(btn) {
  const card = btn.closest('[data-cs-idx]');
  if (!card) return;
  let csData;
  try { csData = JSON.parse(card.dataset.csJson || '{}'); } catch { return; }
  btn.textContent = 'Loading...';
  btn.disabled = true;
  // Auto-reset button if no reply within 30s
  const _t = setTimeout(function() { btn.textContent = 'Suggest another'; btn.disabled = false; }, 30000);
  card.dataset.regenTimer = String(_t);
  window.parent.postMessage({
    type: 'cs:regen',
    idx: card.dataset.csIdx,
    data: csData,
    strategyId: CS_STRATEGY_ID,
  }, '*');
}

let _addBtnSeq = 0;
function addToSection(btn) {
  const sectionType = btn.dataset.csSection;
  const container = document.querySelector('[data-cs-section="' + sectionType + '"]');
  const existing = container ? [...container.querySelectorAll('.blog-title,.new-page-title')].map(function(el) { return el.textContent.trim(); }).filter(Boolean) : [];
  btn.textContent = 'Adding...';
  btn.disabled = true;
  const btnId = 'cs-add-' + (++_addBtnSeq);
  btn.id = btnId;
  // Auto-reset if no reply within 30s
  setTimeout(function() {
    const b = document.getElementById(btnId);
    if (b && b.disabled) { b.textContent = '+ Add another'; b.disabled = false; b.removeAttribute('id'); }
  }, 30000);
  window.parent.postMessage({ type: 'cs:add', sectionType: sectionType, strategyId: CS_STRATEGY_ID, existing: existing, btnId: btnId }, '*');
}

function _esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function buildNewCard(type, title, notes, keywords) {
  const idx = Date.now();
  const json = _esc(JSON.stringify({ type: type, title: title || '', url: title || '', keywords: keywords || [], notes: notes || '' }));
  const editBar = '<div class="cs-edit-bar"><button class="cs-edit-btn cs-del" onclick="deleteItem(this)">Remove</button><button class="cs-edit-btn cs-regen" onclick="regenItem(this)">Suggest another</button></div>';
  if (type === 'blog') {
    const count = document.querySelectorAll('.blog-item').length + 1;
    return '<div class="blog-item cs-editable" data-cs-idx="' + idx + '" data-cs-json="' + json + '">' + editBar + '<div class="blog-item-left"><div class="blog-num">' + String(count).padStart(2,'0') + '</div></div><div class="blog-item-body"><div class="blog-item-top"><div class="blog-title">' + _esc(title) + '</div></div><p class="blog-desc">' + _esc(notes) + '</p></div></div>';
  }
  if (type === 'landing') {
    const kws = (keywords || []).slice(0,4).map(function(k) { return '<div class="kw-pill">' + _esc(k) + '</div>'; }).join('');
    return '<div class="new-page-card cs-editable" data-cs-idx="' + idx + '" data-cs-json="' + json + '">' + editBar + '<div class="new-page-card-hdr"><div class="new-page-title">' + _esc(title) + '</div></div><p class="new-page-desc">' + _esc(notes) + '</p><div class="new-page-kws">' + kws + '</div></div>';
  }
  return '<div class="opt-block cs-editable" data-cs-idx="' + idx + '" data-cs-json="' + json + '">' + editBar + '<p class="opt-notes" style="padding:.75rem 1rem">' + _esc(notes) + '</p></div>';
}

function saveStrategy() {
  if (CS_STRATEGY_ID === '__CS_ID__') return;
  const saveBtn = document.getElementById('cs-save-btn');
  if (saveBtn) { saveBtn.textContent = 'Saving...'; saveBtn.disabled = true; }
  // Auto-reset if no reply within 20s (e.g. lost postMessage)
  setTimeout(function() {
    if (saveBtn && saveBtn.textContent === 'Saving...') {
      saveBtn.textContent = 'Error — try again';
      saveBtn.disabled = false;
    }
  }, 20000);
  window.parent.postMessage({
    type: 'cs:save',
    html: document.documentElement.outerHTML,
    strategyId: CS_STRATEGY_ID,
  }, '*');
}

window.addEventListener('message', function(e) {
  if (!e.data || !e.data.type) return;
  if (e.data.type === 'cs:regen:result') {
    const card = document.querySelector('[data-cs-idx="' + e.data.idx + '"]');
    if (card) {
      // Cancel the auto-reset timeout
      if (card.dataset.regenTimer) { clearTimeout(Number(card.dataset.regenTimer)); delete card.dataset.regenTimer; }
      if (e.data.notes) {
        const descEl = card.querySelector('.blog-desc, .new-page-desc, .opt-notes');
        if (descEl) {
          // Push old text so regen can be undone
          _undoStack.push({ kind: 'regen', card: card, descEl: descEl, oldText: descEl.textContent, oldJson: card.dataset.csJson || '' });
          descEl.textContent = e.data.notes;
          try {
            const d = JSON.parse(card.dataset.csJson || '{}');
            d.notes = e.data.notes;
            card.dataset.csJson = JSON.stringify(d);
          } catch {}
          _updateActionBar();
        }
      }
      card.querySelectorAll('.cs-regen').forEach(function(b) {
        b.textContent = 'Suggest another';
        b.disabled = false;
      });
    }
  }
  if (e.data.type === 'cs:save:result') {
    const saveBtn = document.getElementById('cs-save-btn');
    if (e.data.success) {
      if (saveBtn) { saveBtn.textContent = 'Saved'; saveBtn.disabled = false; }
      _undoStack.length = 0;
      _updateActionBar();
      setTimeout(function() { if (saveBtn) saveBtn.textContent = 'Save changes'; }, 2500);
    } else {
      if (saveBtn) { saveBtn.textContent = 'Error — try again'; saveBtn.disabled = false; }
    }
  }
  if (e.data.type === 'cs:add:result') {
    const btn = document.getElementById(e.data.btnId);
    if (btn) { btn.textContent = '+ Add another'; btn.disabled = false; btn.removeAttribute('id'); }
    if (!e.data.title && !e.data.notes) return;
    const container = document.querySelector('[data-cs-section="' + e.data.sectionType + '"]');
    if (!container) return;
    const newCardHtml = buildNewCard(e.data.sectionType, e.data.title || e.data.notes, e.data.notes, e.data.keywords);
    // Insert via DOM (not innerHTML) so we can keep a reference for undo
    const tmp = document.createElement('div');
    tmp.innerHTML = newCardHtml;
    const cardEl = tmp.firstElementChild;
    if (cardEl) {
      container.appendChild(cardEl);
      _undoStack.push({ kind: 'add', el: cardEl });
      _updateActionBar();
    }
  }
});
</script>
</body>
</html>`;
}

// ─── API Routes ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const contentType = request.headers.get("content-type") || "";
    let spreadsheetData: SpreadsheetData;
    let clientName: string;
    let period: string;
    let clientId: string | null;

    if (contentType.includes("application/json")) {
      // ── JSON body: SEMrush-generated data ──────────────────────────────
      const body = await request.json();
      if (!body.spreadsheetData || typeof body.spreadsheetData !== "object") {
        return NextResponse.json({ error: "Missing strategy data" }, { status: 400 });
      }
      spreadsheetData = validateExtractedData(body.spreadsheetData);
      clientName = body.clientName || "Client";
      period = body.period || new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });
      clientId = body.clientId || null;
    } else {
      // ── FormData body: file upload (existing flow) ─────────────────────
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      clientName = (formData.get("clientName") as string) || "Client";
      period = (formData.get("period") as string) || new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });
      clientId = formData.get("clientId") as string | null;

      if (!file) {
        return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
      }

      // Validate file type
      const supportedExtensions = [".xlsx", ".xls", ".csv", ".docx", ".txt"];
      const fileExt = "." + (file.name.toLowerCase().split(".").pop() || "");
      if (!supportedExtensions.includes(fileExt)) {
        return NextResponse.json(
          { error: `Unsupported file format. Please upload one of: ${supportedExtensions.join(", ")}` },
          { status: 400 }
        );
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: "File size must be under 10MB" }, { status: 400 });
      }

      const buffer = await file.arrayBuffer();

      // Extract structured data
      const isSpreadsheet = fileExt === ".xlsx" || fileExt === ".xls";

      if (isSpreadsheet) {
        const legacyData = parseSpreadsheet(buffer);
        const legacyTotal = legacyData.pageOptimisations.length + legacyData.landingPages.length +
          legacyData.categoryPages.length + legacyData.blogPosts.length + legacyData.linkTargets.length;

        if (legacyTotal >= 3) {
          spreadsheetData = legacyData;
        } else {
          const fileText = extractTextFromSpreadsheet(buffer);
          spreadsheetData = await extractWithClaude(fileText, clientName);
        }
      } else {
        const fileText = await extractTextFromFile(buffer, file.name);
        spreadsheetData = await extractWithClaude(fileText, clientName);
      }
    }

    spreadsheetData.clientName = clientName;
    spreadsheetData.period = period;

    // Step 2: Generate AI descriptions using Claude
    let aiContent: Record<string, string> = {};
    try {
      const anthropic = await getAnthropicClient();
      const dataSummary = buildDataSummary(spreadsheetData);

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        system: `You are an expert SEO content strategist at a UK digital marketing agency. You write in British English. You are creating descriptions for a content strategy document for a client called "${clientName}". This is a document the agency will present to the client — write everything from the agency's perspective ("we will do this for you", not "you should do this").

Your task is to write short, punchy descriptions for each section and content piece. Each description should:
- Be 1–2 sentences maximum
- Explain WHY we are doing this and what result it aims to achieve
- Sound confident and professional without being jargon-heavy
- Be written so the client understands what we're delivering for them

Return your response as valid JSON with the following keys:
- "overviewOpportunity": 1–2 sentences about the search opportunity we've identified
- "overviewPlan": 1–2 sentences about what this strategy delivers
- "overviewPriority": 1–2 sentences about what we'll work on first and why
- "overviewScope": 1–2 sentences about the total keyword and content scope
- "sectionDescOpts": 1–2 sentences explaining the page optimisations we'll carry out
- "sectionDescLanding": 1–2 sentences explaining the new landing pages we'll create
- "sectionDescBlog": 1–2 sentences explaining the blog content we'll produce
- "sectionDescLinks": 1–2 sentences explaining the link-building outreach we'll conduct
- For each landing page, a key like "landing_PageTitle": 1–2 sentence description of what we'll build and why
- For each blog post, a key like "blog_PostTitle": 1–2 sentence description of the angle we'll take and who it targets`,
        messages: [
          {
            role: "user",
            content: `Here is the content strategy data for ${clientName} (${period}):\n\n${dataSummary}\n\nPlease generate the descriptions as JSON.`,
          },
        ],
      });

      const textBlock = response.content.find(b => b.type === "text");
      if (textBlock && textBlock.type === "text") {
        let jsonStr = textBlock.text;
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) jsonStr = jsonMatch[1];
        aiContent = JSON.parse(jsonStr.trim());
      }
    } catch (aiError) {
      console.error("AI description generation failed, using defaults:", aiError);
    }

    // Generate the HTML
    const html = generateHtml(spreadsheetData, aiContent);

    // Save to database
    const title = `${clientName} Content Strategy (${period})`;
    const record = await prisma.contentStrategy.create({
      data: {
        clientId: clientId || null,
        title,
        period,
        createdBy: session.user.name,
        spreadsheetData: JSON.stringify(spreadsheetData),
        generatedHtml: html,
      },
    });

    // Inject the real record ID so client-side edit/save works
    const finalHtml = html.replace("'__CS_ID__'", `'${record.id}'`);
    await prisma.contentStrategy.update({ where: { id: record.id }, data: { generatedHtml: finalHtml } });

    return NextResponse.json({
      id: record.id,
      title: record.title,
      stats: spreadsheetData.stats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Content strategy generation error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function buildDataSummary(data: SpreadsheetData): string {
  const lines: string[] = [];
  lines.push(`Client: ${data.clientName}`);
  lines.push(`Period: ${data.period}`);
  lines.push(`\nPage Optimisations (${data.stats.totalPageOptimisations} pages):`);
  for (const opt of data.pageOptimisations.slice(0, 10)) {
    const topKw = opt.keywords[0];
    lines.push(`- ${opt.url}: top keyword "${topKw?.keyword}" (${topKw?.volume} searches/mo), ${opt.keywords.length} total keywords`);
  }
  if (data.pageOptimisations.length > 10) lines.push(`  ... and ${data.pageOptimisations.length - 10} more`);

  lines.push(`\nProposed Landing Pages (${data.landingPages.length + data.categoryPages.length}):`);
  for (const page of [...data.landingPages, ...data.categoryPages]) {
    const topKw = page.keywords[0];
    lines.push(`- "${page.title}": top keyword "${topKw?.keyword}" (${topKw?.volume} searches/mo), ${page.keywords.length} total keywords`);
  }

  lines.push(`\nProposed Blog Posts (${data.blogPosts.length}):`);
  for (const post of data.blogPosts) {
    const topKw = post.keywords[0];
    lines.push(`- "${post.title}": top keyword "${topKw?.keyword}" (${topKw?.volume} searches/mo), ${post.keywords.length} total keywords`);
  }

  lines.push(`\nLink Targets (${new Set(data.linkTargets.map(t => t.url)).size} unique pages):`);
  const grouped = new Map<string, string[]>();
  for (const t of data.linkTargets) {
    const existing = grouped.get(t.url) || [];
    existing.push(`${t.anchorKeyword} (${t.anchorType})`);
    grouped.set(t.url, existing);
  }
  for (const [url, anchors] of grouped) {
    lines.push(`- ${url}: ${anchors.join(", ")}`);
  }

  return lines.join("\n");
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "list") {
    const clientId = searchParams.get("clientId");
    const where = clientId ? { clientId } : {};
    const strategies = await prisma.contentStrategy.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        period: true,
        clientId: true,
        createdBy: true,
        shareToken: true,
        viewCount: true,
        createdAt: true,
        client: { select: { name: true } },
      },
    });
    return NextResponse.json({ strategies });
  }

  if (action === "get") {
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const strategy = await prisma.contentStrategy.findUnique({ where: { id } });
    if (!strategy) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ strategy });
  }

  if (action === "share") {
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const strategy = await prisma.contentStrategy.findUnique({
      where: { id },
      select: { shareToken: true },
    });
    if (!strategy) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (strategy.shareToken) {
      return NextResponse.json({ shareToken: strategy.shareToken });
    }

    // Generate new share token
    const shareToken = crypto.randomUUID();
    await prisma.contentStrategy.update({
      where: { id },
      data: { shareToken },
    });
    return NextResponse.json({ shareToken });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id, sharePassword, generatedHtml } = await request.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const updateData: Record<string, unknown> = {};

    if (sharePassword !== undefined) {
      if (sharePassword === null || sharePassword === "") {
        updateData.sharePassword = null;
      } else {
        // Hash the password with SHA-256 (simple, sufficient for share link protection)
        const hash = crypto.createHash("sha256").update(sharePassword).digest("hex");
        updateData.sharePassword = hash;
      }
    }

    if (generatedHtml !== undefined) {
      if (typeof generatedHtml !== "string" || generatedHtml.length < 500) {
        return NextResponse.json({ error: "Invalid HTML content" }, { status: 400 });
      }
      updateData.generatedHtml = generatedHtml;
    }

    const strategy = await prisma.contentStrategy.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ id: strategy.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Content strategy update error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prisma.contentStrategy.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
