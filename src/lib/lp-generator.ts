/**
 * AI Landing Page generator — uses Anthropic Claude Sonnet to generate
 * and iteratively refine standalone, high-converting landing pages.
 *
 * Uses streaming for large HTML output (same pattern as content-strategy-generator).
 */

import { getAnthropicClient } from "@/lib/anthropic-client";
import type { BrandContext } from "@/lib/brand-extractor";

const MODEL = "claude-opus-4-7";
// Opus 4.7 supports up to 32K output tokens. A fully-populated landing
// page (hero + social proof + 3-4 benefits + how-it-works + testimonials
// + offer + FAQ + final CTA + footer) routinely exceeds 16K. 32K gives
// comfortable headroom so the page never truncates after the hero.
const MAX_TOKENS = 32000;

// ── Types ────────────────────────────────────────────────────────────────────

export interface GenerateLPOptions {
  brief: string;
  campaignType: string; // "lead-gen" | "event" | "product-launch" | "service" | "ecommerce"
  brandContext: BrandContext;
  targetAudience?: string;
  templateHtml?: string; // If generating from a saved template
  additionalInstructions?: string;
  uploadedImageUrls?: string[]; // User-provided images uploaded in the wizard
}

export interface RefineLPOptions {
  currentHtml: string;
  prompt: string;
  brandContext: BrandContext;
  conversationHistory?: { role: "user" | "assistant"; content: string }[];
  referenceHtml?: string; // Uploaded inspiration page from the user
}

export interface ChatLPOptions {
  currentHtml: string;
  message: string;
  brandContext: BrandContext;
  conversationHistory?: { role: "user" | "assistant"; content: string }[];
  referenceHtml?: string;
}

export interface ChatLPResponse {
  message: string;
  refinementPrompt?: string; // Extracted from READY_TO_APPLY: tag in AI response
  stackedChanges?: string[]; // Extracted from STACK_CHANGE: tags — added to staged list
}

// ── Vision helpers ───────────────────────────────────────────────────────────

const IMAGE_FETCH_TIMEOUT_MS = 5000;
const SUPPORTED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

/** Mime type → Anthropic media_type literal */
type AnthropicMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

/**
 * Fetch a single image URL and return an Anthropic base64 content block.
 * Returns null on any error (timeout, non-2xx, unsupported type, etc.) so
 * callers can silently skip bad URLs.
 *
 * We fetch server-side because Anthropic's vision API cannot reach
 * URLs that require cookies, sit behind a CDN that blocks bots, or
 * redirect through auth walls.
 */
async function fetchImageBlock(
  url: string,
): Promise<{ type: "image"; source: { type: "base64"; media_type: AnthropicMediaType; data: string } } | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          // Mimic a browser to avoid bot-detection rejections
          "User-Agent":
            "Mozilla/5.0 (compatible; i3media-lp-generator/1.0; +https://stratos.i3media.co.uk)",
          Accept: "image/webp,image/png,image/jpeg,image/*",
        },
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
    if (!SUPPORTED_MIME_TYPES.has(contentType)) return null;

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return {
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: contentType as AnthropicMediaType,
        data: base64,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Build Anthropic base64 image content blocks from scraped + uploaded URLs.
 * Images are fetched server-side to avoid Anthropic's URL download failures
 * (CDN blocks, cookie-gated assets, redirects, etc.).
 * SVGs and data URIs are excluded as Claude's vision does not support them.
 * Fetches run in parallel; failed fetches are silently dropped.
 */
async function buildImageBlocks(
  imageryUrls: string[],
  uploadedUrls: string[] | undefined,
  maxImages: number,
): Promise<Array<{ type: "image"; source: { type: "base64"; media_type: AnthropicMediaType; data: string } }>> {
  const combined = [
    ...(uploadedUrls ?? []),
    ...imageryUrls,
  ].filter(
    (u) =>
      /^https?:\/\//i.test(u) &&
      !/\.svg(\?|$)/i.test(u) &&
      !/^data:/i.test(u),
  ).slice(0, maxImages);

  if (!combined.length) return [];

  const results = await Promise.all(combined.map(fetchImageBlock));
  return results.filter((b): b is NonNullable<typeof b> => b !== null);
}

/** Number each URL so prompt references match visual attachment order. */
function labelledImageUrls(
  imageryUrls: string[],
  uploadedUrls: string[] | undefined,
  maxImages: number,
): string {
  const combined = [
    ...(uploadedUrls ?? []),
    ...imageryUrls,
  ].filter(
    (u) => /^https?:\/\//i.test(u) && !/\.svg(\?|$)/i.test(u),
  ).slice(0, maxImages);

  if (!combined.length) return "";
  return combined.map((u, i) => `  Image ${i + 1}: ${u}`).join("\n");
}

// ── System prompts ───────────────────────────────────────────────────────────

function buildGenerateSystemPrompt(brandContext: BrandContext, uploadedImageUrls?: string[]): string {
  const colourBlock = brandContext.colors
    .filter((c) => c.role !== "unknown")
    .slice(0, 6)
    .map((c) => `  ${c.role}: ${c.hex}`)
    .join("\n");

  const fontBlock = brandContext.fonts.length
    ? `Brand fonts: ${brandContext.fonts.join(", ")}`
    : "Use a clean, modern system font stack.";

  // Build page copy reference block
  const pc = brandContext.pageContent;
  let pageCopyBlock = "";
  if (pc) {
    const parts: string[] = [];
    if (pc.metaTitle) parts.push(`Page title: ${pc.metaTitle}`);
    if (pc.metaDescription) parts.push(`Meta description: ${pc.metaDescription}`);
    if (pc.h1) parts.push(`H1: ${pc.h1}`);
    if (pc.headings.length) parts.push(`Section headings:\n${pc.headings.map((h) => `  - ${h}`).join("\n")}`);
    if (pc.ctaTexts.length) parts.push(`CTA button text: ${pc.ctaTexts.join(" | ")}`);
    if (pc.bodyCopy.length) parts.push(`Body copy samples:\n${pc.bodyCopy.map((p) => `  "${p}"`).join("\n")}`);
    if (pc.listItems?.length) parts.push(`List items / bullet points from site (services, features, benefits):\n${pc.listItems.slice(0, 30).map((i) => `  • ${i}`).join("\n")}`);
    if (pc.numericStats?.length) parts.push(`Stats and numbers found on site:\n${pc.numericStats.slice(0, 15).map((s) => `  ${s}`).join("\n")}`);
    if (pc.allBodyText) parts.push(`Full page body text (mine for testimonials, team info, offers, services, FAQs):\n${pc.allBodyText}`);
    if (parts.length > 0) {
      pageCopyBlock = `\n## Existing website copy — USE ALL OF THIS real content to populate the generated page\n\n${parts.join("\n\n")}\n`;
    }
  }

  const rawHtmlBlock = brandContext.rawHtml
    ? `\n## Raw website HTML (supplementary reference for brand signals and any content missed above)\n\n${brandContext.rawHtml.slice(0, 100000)}\n`
    : "";

  return `You are a world-class landing page designer and conversion rate optimisation expert. You are designing the POST-CLICK destination page for a paid advertising campaign (Google Ads, Meta Ads, or LinkedIn Ads).

This is not a homepage. This is not a brochure site. This is the page someone lands on after clicking a specific ad. Every element must reinforce the promise made in that ad and drive the visitor toward a single conversion action.

## Brand Identity

Company: ${brandContext.companyName ?? "Unknown"}
${brandContext.tagline ? `Tagline: ${brandContext.tagline}` : ""}
${brandContext.logoUrl ? `Logo URL: ${brandContext.logoUrl}` : ""}
${brandContext.faviconUrl ? `Favicon: ${brandContext.faviconUrl}` : ""}

Brand colours:
${colourBlock || "  Use professional, modern colours appropriate for the industry."}

${fontBlock}

${brandContext.contactInfo.phone ? `Phone: ${brandContext.contactInfo.phone}` : ""}
${brandContext.contactInfo.email ? `Email: ${brandContext.contactInfo.email}` : ""}

Social links: ${brandContext.socialLinks.slice(0, 4).join(", ") || "None provided"}
${pageCopyBlock}${rawHtmlBlock}
## Available imagery
${(() => { const labelled = labelledImageUrls(brandContext.imageryUrls, uploadedImageUrls, 8); return labelled ? `The images are attached above for visual analysis. Study each one: identify people, products, locations, brand style, and real content. Use these exact URLs in <img src> tags in the generated page — pick the most suitable image for each placement.\n\n${uploadedImageUrls?.length ? `User-uploaded reference images (prioritise these):\n${uploadedImageUrls.map((u, i) => `  Image ${i + 1}: ${u}`).join("\n")}\n\n` : ""}Scraped website images:\n${labelledImageUrls(brandContext.imageryUrls, undefined, 8)}` : "No images available — use CSS gradients, patterns and bold typography for visual interest. Do NOT use emoji as illustrations."; })()}

## Iconography — strict rule

Never use emoji glyphs (🎯 ✓ ⭐ 🏆 ✅ 📞 etc.) as decorative or functional icons in body content. The Lucide icon library is loaded for you in <head>; render every icon as:

  <i data-lucide="icon-name" aria-hidden="true"></i>

When you need to control size, wrap or style with width/height (Lucide outputs an inline SVG inheriting currentColor). Useful icon names you may rely on:

  check, check-circle, check-circle-2, x, star, sparkles, shield, shield-check, award, badge-check, trophy,
  arrow-right, chevron-right, arrow-down, mouse-pointer-click, hand,
  phone, mail, map-pin, message-circle, message-square, calendar, clock, timer, zap,
  users, user, heart, thumbs-up, smile,
  dollar-sign, pound-sterling, gift, package, truck, shopping-cart, credit-card,
  rocket, target, lightbulb, flame, trending-up, bar-chart, line-chart, percent,
  lock, eye, search, settings, info, help-circle, alert-circle, plus, minus,
Use these for benefit ticks, feature lists, social-proof badges, step numbers (paired with the numeral), CTA buttons, and contact strips. If you need an icon not on this list, pick the closest Lucide name from https://lucide.dev/icons; never invent a name. Do not import any other icon library — Lucide is the only one available.

**IMPORTANT — social/brand icons:** Lucide does NOT include brand icons. The names facebook, instagram, twitter, youtube, linkedin, tiktok, and github are NOT valid Lucide icon names and will render as grey squares. For social media links always use inline SVG paths directly. Example: <a href="..." aria-label="Facebook"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg></a>.

## Post-Click Landing Page Principles

This page exists for ONE reason: to convert the visitor who just clicked a paid ad.

1. **Message match** — the headline on this page must directly echo the ad headline the visitor clicked. If they searched "emergency plumber London" and clicked an ad saying "24/7 Emergency Plumber, London", this page's H1 must feel like the next sentence in that conversation. Zero disconnect.
2. **Single conversion goal** — one CTA, repeated where needed. Every section funnels toward the same action. No competing links, no "learn more about our company" sidetracks.
3. **No escape routes** — minimal or zero navigation. The visitor can convert or leave. That's it. A sticky bar with the CTA and maybe a phone number. No hamburger menus, no footer nav mazes.
4. **Above-fold conviction** — within 3 seconds of landing, the visitor must see: what this is, why it matters to them, and exactly what to do next. Headline, 1-line benefit statement, CTA button. Done.
5. **Speed of trust** — social proof (stats, testimonials, logos, awards) should appear within the first scroll. People who clicked an ad are skeptical by default.
6. **Specificity over generality** — "247 five-star Google reviews" beats "highly rated". "Installed in under 4 hours" beats "fast service". Use the real numbers from the scraped content.
7. **Urgency that isn't fake** — if there's a genuine reason to act now (limited slots, seasonal offer, deadline), use it. Don't fabricate countdown timers.
8. **Scannable structure** — bold claims, short paragraphs, visual breaks. Nobody reads a wall of text after clicking an ad. They skim, validate, then decide.

## Technical Requirements

1. **Single HTML file** with all CSS in a <style> block. No external stylesheets except Google Fonts if needed.
2. **Mobile-first responsive** — most paid traffic is mobile. The page must be stunning on phone screens.
3. **Semantic HTML** — proper heading hierarchy, ARIA labels, alt text on images.
4. **Fast loading** — no frameworks, no heavy JS. This page needs to load instantly from an ad click.
5. **Browser compatible** — modern browsers, no IE.

## Design Freedom

You have TOTAL creative freedom with the visual design. Be bold. Be unexpected. Make the page feel like it was designed by a top creative agency, not generated by a template engine.

Some approaches that work brilliantly for paid landing pages:
- Full-bleed hero sections with strong gradient or image treatments
- Oversized typography that commands attention
- Asymmetric layouts that break the grid
- Micro-animations on scroll (CSS only, no JS libraries)
- Floating elements, glassmorphism, bold colour blocking
- Dramatic contrast between sections
- Card-based social proof that feels modern
- Progress/timeline sections for process steps

Do whatever serves the conversion goal best. The only constraint: it must look premium, load fast, and convert.

## Form Handling

Include a lead capture form if appropriate for the campaign type. The form MUST have:
- Attribute: data-lp-form="true" (this enables our form capture system)
- Standard fields: name (required), email (required), phone (optional), message (optional)
- A clear, benefit-oriented submit button (not just "Submit")
- The form action should be "#" — our JavaScript intercepts it
- Keep forms SHORT — 3-4 fields maximum. Every extra field kills conversion rate.

## Page Structure (adapt to campaign, don't follow rigidly)

1. Sticky bar (logo + phone/CTA, minimal, no complex nav)
2. Hero (headline matching ad copy, sub-headline with key benefit, primary CTA, trust indicator)
3. Social proof strip (stats, ratings, client logos)
4. Core benefits (3-4 max, with icons/visuals, benefit-led not feature-led)
5. How it works / process (if relevant)
6. Testimonials / case studies
7. Offer / pricing (if applicable)
8. FAQ (address objections)
9. Final CTA section (urgency, restate value prop, conversion form or button)
10. Minimal footer (contact info only, no nav links)

## Content Mining — CRITICAL

You have been given substantial scraped content from the client's real website above. You MUST use it:

- **Use real services and products** — extract every service, product, or offering mentioned in the list items and body copy. Do NOT invent services that aren't mentioned.
- **Use real statistics and numbers** — years trading, clients served, ratings, completion rates, project counts, etc.
- **Use real testimonials** — if any testimonial text appears in the body copy or list items, include them verbatim.
- **Use real team and staff names/roles** if present.
- **Use real awards, certifications, accreditations** if mentioned.
- **Use real process steps/methodology** if described.
- **Use real pricing or package names** if mentioned.
- **Use real FAQs** — if any questions or answers appear in the copy, include them.
- **Every section must be richly populated** — minimum 3-4 bullet points or content items per content section. Sparse sections are not acceptable.
- **If a piece of content is genuinely not available** from the scraped data, write compelling, accurate copy based on what IS known about the business. Never leave a section with just 1-2 generic lines.

## Output Rules

- Return ONLY the complete HTML document. No markdown fences, no explanation text.
- Start with <!DOCTYPE html> and end with </html>.
- Do NOT include any placeholder text like "[Company Name]" — use the actual brand data provided.
- All copy must be short, punchy, and conversion-focused. This is an ad landing page, not a blog post.
- Use British English for all text.
- **Never use em dashes (— or &mdash;)**. Use a comma, colon, or rewrite the sentence instead.`;
}

const REFINE_SYSTEM_PROMPT = `You are an expert landing page designer iterating on an existing landing page.

CRITICAL RULE: Apply ONLY the specific changes requested. Do NOT:
- Rewrite sections that were not mentioned
- Change copy, headlines, or CTAs unless explicitly asked
- Alter colours, fonts, or brand identity unless asked
- Restructure the page layout unless asked
- "Improve" anything that was not part of the request

For each requested change, make the smallest accurate edit possible. Treat every line you do not need to change as sacred — preserve it exactly.

Always preserve:
- The data-lp-form="true" attribute on any forms
- All CSS custom properties and the <style> block structure
- Responsive breakpoints and media queries
- The overall section order and structure

Return ONLY the complete updated HTML document. No markdown fences, no explanation.
Start with <!DOCTYPE html> and end with </html>.

Use British English for all text.
Never use em dashes (— or &mdash;). Use a comma, colon, or rewrite the sentence instead.

Never introduce emoji glyphs as icons. Lucide icons are available — replace any emoji with <i data-lucide="name" aria-hidden="true"></i>. Preserve any existing <i data-lucide=...> tags exactly.`;

// ── Form capture script ──────────────────────────────────────────────────────

export function getFormCaptureScript(shareToken: string): string {
  return `
<script>
(function() {
  var forms = document.querySelectorAll('[data-lp-form="true"]');
  forms.forEach(function(form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      var btn = form.querySelector('button[type="submit"], input[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
      var fd = new FormData(form);
      var data = {};
      fd.forEach(function(v, k) { data[k] = v; });
      fetch('/api/share/landing-page/${shareToken}/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function(r) {
        if (r.ok) {
          form.innerHTML = '<div style="text-align:center;padding:32px 16px"><h3 style="color:inherit;margin-bottom:8px">Thank you!</h3><p style="opacity:.8">We\\'ll be in touch shortly.</p></div>';
        } else {
          if (btn) { btn.disabled = false; btn.textContent = 'Try Again'; }
        }
      }).catch(function() {
        if (btn) { btn.disabled = false; btn.textContent = 'Try Again'; }
      });
    });
  });
})();
</script>`;
}

// ── Inject form script into HTML ─────────────────────────────────────────────

export function injectFormScript(html: string, shareToken: string): string {
  const script = getFormCaptureScript(shareToken);
  // Insert before </body> if present, otherwise append
  if (html.includes("</body>")) {
    return html.replace("</body>", `${script}\n</body>`);
  }
  return html + script;
}

// ── Inject Lucide icon runtime ──────────────────────────────────────────────
//
// Loads Lucide via CDN and re-renders any <i data-lucide="name"> elements.
// A small MutationObserver re-runs createIcons() if the page mutates so that
// dynamically-injected sections (e.g. from the lead-capture success state)
// still show icons. Safe to call multiple times — the script tag is idempotent.

const LUCIDE_SCRIPT = `
<!-- Lucide icons (post-click LP icon set) -->
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js" defer></script>
<script>
(function(){
  function init(){
    if (!window.lucide) return;
    try { window.lucide.createIcons(); } catch(e){}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  // Re-render on dynamic DOM changes (form success states, etc.)
  if (window.MutationObserver) {
    var pending = false;
    var mo = new MutationObserver(function(){
      if (pending) return;
      pending = true;
      requestAnimationFrame(function(){ pending = false; init(); });
    });
    if (document.body) mo.observe(document.body, { childList: true, subtree: true });
    else document.addEventListener('DOMContentLoaded', function(){ mo.observe(document.body, { childList: true, subtree: true }); });
  }
})();
</script>`;

export function injectLucide(html: string): string {
  if (html.includes("unpkg.com/lucide")) return html; // already injected
  if (html.includes("</body>")) {
    return html.replace("</body>", `${LUCIDE_SCRIPT}\n</body>`);
  }
  return html + LUCIDE_SCRIPT;
}

// ── Generate landing page ────────────────────────────────────────────────────

export async function generateLandingPage(opts: GenerateLPOptions): Promise<string> {
  const anthropic = await getAnthropicClient();

  const systemPrompt = buildGenerateSystemPrompt(opts.brandContext, opts.uploadedImageUrls);

  let userPrompt = `Generate a complete, high-converting post-click landing page for a paid advertising campaign. This page is the destination someone lands on after clicking a Google/Meta/LinkedIn ad. It must message-match the ad, have ONE conversion goal, no escape routes, and look like it was designed by a premium creative agency.\n\nStudy every piece of scraped website content in the system prompt and use ALL of it — real services, real stats, real testimonials, real process steps. Every section must be fully populated with real, specific content. Do not leave any section sparse.\n\nBe bold and creative with the design. Make it visually stunning.\n\n`;
  userPrompt += `Campaign type: ${opts.campaignType}\n`;
  userPrompt += `Brief: ${opts.brief}\n`;
  if (opts.targetAudience) userPrompt += `Target audience: ${opts.targetAudience}\n`;
  if (opts.additionalInstructions) userPrompt += `\nAdditional instructions: ${opts.additionalInstructions}\n`;

  if (opts.templateHtml) {
    userPrompt += `\n## Template HTML\n\nUse this as a structural starting point — adapt the layout and style while replacing all placeholder content with real, campaign-specific content:\n\n${opts.templateHtml.slice(0, 30000)}`;
  }

  // Build vision blocks so Claude can actually see the scraped/uploaded images
  const imageBlocks = await buildImageBlocks(opts.brandContext.imageryUrls, opts.uploadedImageUrls, 8);
  const userContent = imageBlocks.length
    ? ([...imageBlocks, { type: "text" as const, text: userPrompt }] as const)
    : userPrompt;

  // Use streaming for large responses
  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: "user", content: userContent as Parameters<typeof anthropic.messages.stream>[0]["messages"][0]["content"] }],
  });

  const response = await stream.finalMessage();
  const block = response.content[0];
  let html = block.type === "text" ? block.text.trim() : "";

  // Strip markdown fences if Claude wraps output
  html = stripMarkdownFences(html);

  // Surface truncation: if Claude hit max_tokens or the HTML doesn't end
  // with a closing </html> tag, the page will visually "die" partway down.
  // Log loudly so it's visible in lambda logs.
  if (response.stop_reason === "max_tokens") {
    console.warn(
      `[lp-generator] Output truncated at max_tokens (${MAX_TOKENS}). ` +
        `HTML length: ${html.length} chars. Consider raising MAX_TOKENS or simplifying the brief.`,
    );
  } else if (!/<\/html>\s*$/i.test(html)) {
    console.warn(
      `[lp-generator] HTML does not end with </html> (stop_reason: ${response.stop_reason}). ` +
        `Length: ${html.length} chars. Output may be incomplete.`,
    );
  }

  return html;
}

// ── Critique landing page ───────────────────────────────────────────────────

export interface LPCritiqueItem {
  area: string; // e.g. "Hero", "Social Proof", "FAQ"
  issue: string; // What's wrong
  fix: string; // Concrete change to make
  severity: "high" | "medium" | "low";
}

const CRITIQUE_SYSTEM_PROMPT = `You are a brutally honest senior CRO specialist and conversion expert reviewing a post-click landing page generated for a paid ad campaign.

Your job: identify what is genuinely weak about this page and how to fix it. Be specific, be honest, do not flatter.

Score the page across these dimensions:
1. **Message match** — does the hero message-match what an ad-clicker would expect?
2. **Above-fold conviction** — within 3 seconds, is the value prop crystal clear?
3. **Section completeness** — is every section richly populated, or are some sparse/generic?
4. **Specificity** — does it use real numbers, real services, real testimonials, or generic filler?
5. **Visual hierarchy** — is the page scannable, with clear breaks and emphasis?
6. **Trust building** — does social proof appear early and feel authentic?
7. **Single conversion goal** — is there one clear CTA, repeated where needed?
8. **Mobile considerations** — would this work on a phone (the dominant paid traffic device)?
9. **Copy quality** — short, punchy, benefit-led, or overwritten?
10. **Design boldness** — does it look premium, or does it feel templated/generic?

Return ONLY a valid JSON array of critique items. Each item must have:
- "area": short label (e.g. "Hero", "Benefits", "FAQ", "Final CTA")
- "issue": one-sentence description of what is wrong
- "fix": one-sentence concrete instruction the refinement model can execute
- "severity": "high" | "medium" | "low"

Return between 5 and 12 items, prioritising the highest-impact improvements. If the page is genuinely strong in an area, do not invent issues — focus on the real weaknesses.

Output format example:
[
  { "area": "Hero", "issue": "Headline is generic and does not echo the campaign brief language.", "fix": "Rewrite the H1 to lead with the specific outcome from the brief: '[outcome]'.", "severity": "high" }
]

If you spot any emoji glyphs being used as icons (e.g. ✓ 🎯 ⭐ 📞), flag it as a high-severity issue with the fix: "Replace the emoji with the matching Lucide icon: <i data-lucide=\"name\" aria-hidden=\"true\"></i> using the project's Lucide whitelist."

Use British English. No markdown fences, no commentary, just the JSON array.`;

export async function critiqueLandingPage(opts: {
  html: string;
  brief: string;
  campaignType: string;
  brandContext: BrandContext;
  targetAudience?: string;
}): Promise<LPCritiqueItem[]> {
  const anthropic = await getAnthropicClient();

  const userPrompt = `Review the following landing page HTML for a ${opts.campaignType} campaign.

## Campaign brief
${opts.brief}

${opts.targetAudience ? `## Target audience\n${opts.targetAudience}\n` : ""}
## Company
${opts.brandContext.companyName ?? "Unknown"}${opts.brandContext.tagline ? ` — ${opts.brandContext.tagline}` : ""}

## The landing page HTML to critique
${opts.html}

Identify the highest-impact improvements as a JSON array.`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: CRITIQUE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const block = response.content[0];
  let text = block.type === "text" ? block.text.trim() : "";

  // Strip any markdown fences just in case
  text = stripMarkdownFences(text).trim();

  try {
    const parsed = JSON.parse(text) as unknown;
    if (!Array.isArray(parsed)) {
      console.warn("[lp-generator] Critique response was not an array, ignoring");
      return [];
    }
    return parsed.filter(
      (item): item is LPCritiqueItem =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as LPCritiqueItem).area === "string" &&
        typeof (item as LPCritiqueItem).issue === "string" &&
        typeof (item as LPCritiqueItem).fix === "string",
    );
  } catch (err) {
    console.warn("[lp-generator] Critique JSON parse failed:", err);
    return [];
  }
}

// ── Generate, critique, and iteratively refine ──────────────────────────────

export interface GenerateAndRefineOptions extends GenerateLPOptions {
  /** Number of refinement passes to run after the initial generation. Default 1. */
  refinementPasses?: number;
  /** Maximum number of fixes to apply per refinement pass. Default 4. */
  fixesPerPass?: number;
  /** Optional progress callback for surfacing status to the caller. */
  onProgress?: (message: string) => Promise<void> | void;
}

/**
 * Generate a landing page, then critique it and apply targeted refinements
 * in batches. Splitting the work across multiple Anthropic calls gives each
 * pass a fresh 32K-token output budget, so neither the initial generation
 * nor the refinements get truncated. Each pass also stays focused: critique
 * is one structured call, and each refinement only applies a handful of
 * specific changes rather than rewriting the whole page in one go.
 */
export async function generateLandingPageWithCritique(
  opts: GenerateAndRefineOptions,
): Promise<{ html: string; critique: LPCritiqueItem[]; passes: number }> {
  const refinementPasses = Math.max(0, opts.refinementPasses ?? 1);
  const fixesPerPass = Math.max(1, opts.fixesPerPass ?? 4);

  if (opts.onProgress) await opts.onProgress("Generating landing page draft...");
  let html = await generateLandingPage(opts);

  if (refinementPasses === 0) {
    return { html, critique: [], passes: 0 };
  }

  if (opts.onProgress) await opts.onProgress("Critiquing landing page...");
  const critique = await critiqueLandingPage({
    html,
    brief: opts.brief,
    campaignType: opts.campaignType,
    brandContext: opts.brandContext,
    targetAudience: opts.targetAudience,
  });

  if (critique.length === 0) {
    return { html, critique: [], passes: 0 };
  }

  // Sort highest severity first so the most impactful fixes land in the
  // earliest passes — if anything fails we still get the big wins.
  const severityRank = { high: 0, medium: 1, low: 2 } as const;
  const sorted = [...critique].sort(
    (a, b) => severityRank[a.severity] - severityRank[b.severity],
  );

  let passes = 0;
  for (let i = 0; i < refinementPasses; i++) {
    const batch = sorted.slice(i * fixesPerPass, (i + 1) * fixesPerPass);
    if (batch.length === 0) break;

    const instructions = batch
      .map((item, idx) => `${idx + 1}. [${item.area}] ${item.fix}`)
      .join("\n");

    if (opts.onProgress) {
      await opts.onProgress(
        `Refining landing page (pass ${i + 1}/${refinementPasses}, ${batch.length} fixes)...`,
      );
    }

    try {
      html = await refineLandingPage({
        currentHtml: html,
        brandContext: opts.brandContext,
        prompt: `Apply the following targeted improvements. Each is a small, specific change — do not rewrite anything that is not mentioned.\n\n${instructions}`,
      });
      passes++;
    } catch (err) {
      console.warn(`[lp-generator] Refinement pass ${i + 1} failed (keeping previous version):`, err);
      break;
    }
  }

  return { html, critique, passes };
}

// ── Refine landing page ──────────────────────────────────────────────────────

export async function refineLandingPage(opts: RefineLPOptions): Promise<string> {
  const anthropic = await getAnthropicClient();

  // Build brand context summary for the refine prompt
  const colourSummary = opts.brandContext.colors
    .filter((c) => c.role !== "unknown")
    .slice(0, 4)
    .map((c) => `${c.role}: ${c.hex}`)
    .join(", ");

  const messages: { role: "user" | "assistant"; content: string }[] = [];

  // Include recent conversation history for context (last 6 turns)
  if (opts.conversationHistory?.length) {
    const recent = opts.conversationHistory.slice(-6);
    messages.push(...recent);
  }

  // Add the current refinement request
  let userContent = `Here is the current landing page HTML:\n\n${opts.currentHtml}\n\nBrand colours: ${colourSummary}`;

  if (opts.brandContext.rawHtml) {
    // The current LP HTML is sent in full above; this is the SCRAPED ORIGINAL
    // website kept as a brand/copy reference so Claude can pull more authentic
    // wording when adding new sections. 20 KB is a safe middle ground —
    // enough to retain hero + several inner sections without burning the
    // function-duration budget on a refine.
    userContent += `\n\n## Original scraped website HTML (brand and copy reference):\n${opts.brandContext.rawHtml.slice(0, 20000)}`;
  }

  userContent += `\n\nPlease make the following changes:\n${opts.prompt}`;

  if (opts.referenceHtml) {
    userContent += `\n\n## Reference page for inspiration\nThe user has uploaded an HTML page they like. Use it for structural and feature inspiration only — preserve the current page's brand identity, colours, and all existing copy:\n\n${opts.referenceHtml}`;
  }

  messages.push({ role: "user", content: userContent });

  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: REFINE_SYSTEM_PROMPT,
    messages,
  });

  const response = await stream.finalMessage();
  const block = response.content[0];
  let html = block.type === "text" ? block.text.trim() : "";

  html = stripMarkdownFences(html);

  return html;
}

// ── Chat about landing page ─────────────────────────────────────────────────

const CHAT_SYSTEM_PROMPT = `You are a senior CRO specialist and landing page expert helping a digital agency improve a client landing page. You have access to a web search tool and should use it proactively when the user asks about trends, current best practices, competitor approaches, layout ideas, or anything requiring up-to-date knowledge.

Your role is to discuss improvements conversationally — analyse the page, research current trends when relevant, ask clarifying questions, suggest specific changes, and explain your reasoning. Do NOT generate HTML unless explicitly asked.

Guidelines:
- Be concise and specific. Format your responses with **bold**, bullet points, and short paragraphs — your output is rendered as Markdown.
- Use web search to find current landing page trends, layout patterns, CRO research, or industry-specific examples when relevant. Cite what you found.
- Ask a single clarifying question if you need more context before recommending.
- Reference the actual page content (headlines, CTAs, sections) when analysing.
- If the user has uploaded a reference page, note what specific features or patterns from it would benefit the current page.

## Action tags (output these on their own line at the very end of your response, after all explanatory text)

Use READY_TO_APPLY when the user wants a single specific change applied to the HTML right now:
  READY_TO_APPLY: <a clear, precise instruction for updating the HTML>

Use STACK_CHANGE to add a change to the user's staged list for later batch implementation. Output one tag per discrete change:
  STACK_CHANGE: <a clear, precise instruction for updating the HTML>

Rules:
- When a user says "yes", "do it", "good idea", "save that", "add it to the list", "stack that", or agrees with a single suggestion, output ONE STACK_CHANGE for that agreement.
- When a user says "stack all of those" or "add everything you suggested", output a STACK_CHANGE tag for each individual suggestion from your previous message.
- When the user says "do it all now" or similar, output a single READY_TO_APPLY covering all discussed changes.
- When the user wants to apply one thing immediately, use READY_TO_APPLY.
- You MAY output both READY_TO_APPLY and one or more STACK_CHANGE tags in the same response if the situation calls for it.
- Ensure instructions are unambiguous enough for the refine function to execute without further context.

Use British English. Never use em dashes (— or &mdash;). Use commas, colons, or rewrite instead.`;

export async function chatAboutLandingPage(opts: ChatLPOptions): Promise<ChatLPResponse> {
  const anthropic = await getAnthropicClient();

  const messages: { role: "user" | "assistant"; content: string }[] = [];

  // Include recent conversation history (last 12 turns)
  if (opts.conversationHistory?.length) {
    messages.push(...opts.conversationHistory.slice(-12));
  }

  let userContent = `Here is the current landing page HTML:\n\n${opts.currentHtml}\n\n${opts.message}`;

  if (opts.referenceHtml) {
    userContent += `\n\n## Reference page the user uploaded\n${opts.referenceHtml}`;
  }

  messages.push({ role: "user", content: userContent });

  // Use Anthropic's server-side web search tool so Claude can look up trends/layouts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const webSearchTool = { type: "web_search_20250305", name: "web_search", max_uses: 3 } as any;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: CHAT_SYSTEM_PROMPT,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: [webSearchTool] as any,
    messages,
  });

  // Web search produces multiple content blocks; find the last text block (Claude's final answer)
  const textBlocks = response.content.filter((b) => b.type === "text");
  const lastText = textBlocks[textBlocks.length - 1];
  const raw = lastText && "text" in lastText ? (lastText.text as string).trim() : "";

  // Extract READY_TO_APPLY tag
  const tagMatch = raw.match(/READY_TO_APPLY:\s*(.+?)(?:\n|$)/);
  const refinementPrompt = tagMatch ? tagMatch[1].trim() : undefined;

  // Extract all STACK_CHANGE tags
  const stackMatches = [...raw.matchAll(/STACK_CHANGE:\s*(.+?)(?:\n|$)/g)];
  const stackedChanges = stackMatches.length > 0 ? stackMatches.map((m) => m[1].trim()) : undefined;

  // Strip action tags from displayed message
  const message = raw
    .replace(/\nREADY_TO_APPLY:.+?(\n|$)/g, "")
    .replace(/READY_TO_APPLY:.+?(\n|$)/g, "")
    .replace(/\nSTACK_CHANGE:.+?(\n|$)/g, "")
    .replace(/STACK_CHANGE:.+?(\n|$)/g, "")
    .trim();

  return { message, refinementPrompt, stackedChanges };
}

// ── Section-by-section generation ───────────────────────────────────────────
//
// Instead of one massive call trying to produce the whole page in one shot,
// this approach splits generation into three focused phases:
//
//  Phase 1 — PLAN
//    Single call. Analyses the brand context + brief, decides which sections
//    to include, writes a complete CSS design system, writes the sticky bar
//    HTML, and records a specific copywriting angle + content items for each
//    section. Max 8 sections to stay well inside the 300 s route timeout.
//
//  Phase 2 — SECTION CALLS (sequential)
//    One dedicated Anthropic call per section, each with its own 8 K-token
//    output budget. Each call receives the CSS design system (so it can
//    reference CSS variables / shared classes), its own section brief, and
//    a trimmed preview of the last two sections already generated (for
//    visual coherence). Sections embed their own layout CSS in a <style>
//    tag; the assembly step hoists those tags to <head>.
//
//  Phase 3 — ASSEMBLY
//    Combines the design system CSS + all extracted section <style> blocks,
//    wraps everything in a valid HTML document, and appends the Lucide icon
//    script and form-capture boilerplate.
//
// Falls back silently to the legacy single-call generateLandingPage() if
// the plan call fails or returns unparseable output.

export interface LPSectionPlan {
  /** URL-safe identifier, e.g. "hero", "benefits", "faq". */
  id: string;
  /** Human label shown in progress messages. */
  name: string;
  /** Specific copywriting angle the section should take. */
  angle: string;
  /** Exact content items from the scrape to include (real stats, services, quotes). */
  contentItems: string[];
  /** Visual layout suggestion (optional). */
  layoutHint?: string;
}

export interface LPPagePlan {
  pageTitle: string;
  metaDescription: string;
  conversionGoal: string;
  primaryCtaText: string;
  /** Complete CSS text (no <style> wrapper) for shared variables + base + components. */
  cssDesignSystem: string;
  /** Fully rendered sticky bar HTML. */
  stickyBarHtml: string;
  sections: LPSectionPlan[];
}

// Token budgets for the section-by-section path
const SECTION_MAX_TOKENS = 8000;
const PLAN_MAX_TOKENS = 10000;

// ── Plan prompt ───────────────────────────────────────────────────────────────

const LP_PLAN_SYSTEM_PROMPT = `You are a world-class landing page architect and CRO specialist. You are planning — not generating — a high-converting post-click landing page.

Your job this call is:
1. Decide which sections to include and their order (8 sections maximum).
2. For each section, define a specific copywriting angle and list the exact real content items from the scraped data to include. Be specific — name actual services, real statistics, verbatim testimonials.
3. Write a complete CSS design system that all sections will share.
4. Write the sticky bar HTML.

## CSS design system requirements
The cssDesignSystem must be complete, valid CSS (no <style> wrapper). Include:
- :root custom properties (all colours with descriptive names, spacing, border-radius, font stack)
- *, *::before, *::after reset and box-sizing
- html, body base styles
- Heading hierarchy (h1 through h4)
- Shared reusable classes: .btn-primary, .btn-secondary, .section-tag, .section-inner, .card, .reveal
- Sticky bar: .sticky-bar, .sticky-logo, .sticky-actions, .sticky-cta, .sticky-phone
- Footer: .footer, .footer-inner, .footer-logo, .footer-address, .footer-contact, .footer-social, .footer-legal
- Form: .form-group, .form-label, .form-input, .form-select, .form-textarea, .form-submit, .form-row, .form-privacy
- Keyframe animations: fadeInUp, fadeIn, pulse (for hero entrance animations)
- Scroll reveal: .reveal (opacity 0 translate-y 30px), .reveal.visible (opacity 1 translate-y 0, transition 0.6s)
- Mobile-first responsive base

## Sticky bar requirements
- Fixed to top, z-index 1000, dark / brand background
- Logo img on the left (use logo URL if available), primary CTA button on the right
- Phone number if available
- Do NOT use Lucide icons for social media brand logos (Facebook, Instagram, YouTube, etc.) — Lucide does not include brand/social icons. For any social links use inline SVG paths directly.

## Section planning rules
Typical high-converting structure (adapt to campaign type):
1. Hero — message-match to ad, oversized headline, primary CTA, trust signals
2. Stats / credibility strip — numbers that matter, immediately after hero
3. Benefits — 4-6 benefit cards, icon-led, benefit-focused not feature-focused
4. How it works / Process — if the offer has steps worth showing
5. Testimonials / social proof
6. Offer / pricing — if applicable
7. FAQ — 5-7 objection-killing questions
8. Final CTA — dark background, restate value prop, lead capture form

Vary the visual treatment (background, layout) between sections for a sense of journey.

## Output format
Output ONLY in this exact tagged format. No text outside the tags.

<PAGE_META>
{"pageTitle":"...","metaDescription":"...","conversionGoal":"...","primaryCtaText":"..."}
</PAGE_META>

<CSS>
/* Complete CSS design system — valid CSS, no <style> wrappers */
</CSS>

<STICKY_BAR>
<!-- Sticky bar HTML -->
</STICKY_BAR>

<SECTIONS>
[{"id":"hero","name":"Hero","angle":"...","contentItems":["..."],"layoutHint":"..."},...]
</SECTIONS>

Use British English throughout. No em dashes (use commas or colons instead).`;

function buildLPPlanUserPrompt(opts: GenerateLPOptions): string {
  const bc = opts.brandContext;

  const colourBlock = bc.colors
    .filter((c) => c.role !== "unknown")
    .slice(0, 8)
    .map((c) => `  ${c.role}: ${c.hex}`)
    .join("\n");

  const pc = bc.pageContent;
  const contentParts: string[] = [];
  if (pc) {
    if (pc.metaTitle) contentParts.push(`Site title: ${pc.metaTitle}`);
    if (pc.h1) contentParts.push(`H1: ${pc.h1}`);
    if (pc.headings.length) contentParts.push(`Headings: ${pc.headings.slice(0, 12).join(" | ")}`);
    if (pc.ctaTexts.length) contentParts.push(`CTAs: ${pc.ctaTexts.join(" | ")}`);
    if (pc.listItems?.length)
      contentParts.push(`Services / features:\n${pc.listItems.slice(0, 30).map((i) => `  • ${i}`).join("\n")}`);
    if (pc.numericStats?.length)
      contentParts.push(`Stats: ${pc.numericStats.slice(0, 12).join(" | ")}`);
    if (pc.bodyCopy.length)
      contentParts.push(`Body copy:\n${pc.bodyCopy.slice(0, 10).map((p) => `  "${p}"`).join("\n")}`);
    if (pc.allBodyText)
      contentParts.push(`Full site text:\n${pc.allBodyText.slice(0, 10000)}`);
  }

  return `Plan a high-converting post-click landing page for this campaign.

## Brand
Company: ${bc.companyName ?? "Unknown"}${bc.tagline ? `\nTagline: ${bc.tagline}` : ""}
Logo: ${bc.logoUrl ?? "none"}
Favicon: ${bc.faviconUrl ?? "none"}${bc.contactInfo.phone ? `\nPhone: ${bc.contactInfo.phone}` : ""}${bc.contactInfo.email ? `\nEmail: ${bc.contactInfo.email}` : ""}
Social: ${bc.socialLinks.slice(0, 5).join(", ") || "none"}

## Brand colours
${colourBlock || "  Use professional colours suited to the industry."}

## Brand fonts
${bc.fonts.length ? bc.fonts.join(", ") : "Use a clean system font stack."}

## Scraped website content
${contentParts.join("\n\n") || "No content scraped — infer from brief."}

## Campaign
Type: ${opts.campaignType}
Brief: ${opts.brief}
${opts.targetAudience ? `Target audience: ${opts.targetAudience}` : ""}${opts.additionalInstructions ? `\nAdditional instructions: ${opts.additionalInstructions}` : ""}

Available imagery — images are visually attached for analysis. Identify what each depicts (people, products, settings, brand style) and use them as <img src="..."> where they genuinely improve the page. Reference these exact URLs:
${
  (() => {
    const labelled = labelledImageUrls(
      opts.brandContext.imageryUrls,
      opts.uploadedImageUrls,
      8,
    );
    return labelled || "  None scraped — use CSS gradients and bold typography.";
  })()
}

Now output the plan using the tagged format specified in your instructions.`;
}

// ── Section prompt ────────────────────────────────────────────────────────────

const SECTION_SYSTEM_PROMPT = `You are a world-class landing page section designer generating ONE section of a high-converting post-click landing page.

Rules:
1. Output ONLY the HTML for this section. Start with an optional <style> block for section-specific CSS (not in the design system), then the section element itself.
2. Reference the CSS design system variables and shared classes freely. Do NOT redefine them.
3. Make this section visually outstanding: bold, unexpected, premium.
4. Use Lucide icons for UI icons: <i data-lucide="icon-name" aria-hidden="true"></i>. Valid icon names: check, check-circle, shield, award, star, sparkles, arrow-right, chevron-right, phone, mail, map-pin, calendar, clock, zap, users, heart, lock, trophy, target, flame, trending-up, bar-chart, gift, rocket, lightbulb, plus, info.
5. Do NOT use Lucide for brand/social icons (Facebook, Instagram, YouTube, Twitter, LinkedIn, TikTok). Use inline SVG paths for those.
6. No emoji as icons. No placeholder text. No "[Company Name]" etc.
7. British English, no em dashes, short punchy sentences.
8. Mobile-first responsive. Fully populate every grid, list, or card — minimum 3-4 items.
9. Output ONLY the section fragment. No DOCTYPE, no html, no head, no body wrapper, no markdown fences, no explanation text.
10. data-lp-form="true" is required on any form — our JS intercepts it.`;

function buildSectionUserPrompt(params: {
  plan: LPPagePlan;
  section: LPSectionPlan;
  previousSectionsHtml: string;
  brandContext: BrandContext;
  uploadedImageUrls?: string[];
}): string {
  const { plan, section, previousSectionsHtml, brandContext, uploadedImageUrls } = params;

  const labelled = labelledImageUrls(brandContext.imageryUrls, uploadedImageUrls, 4);
  const imagery = labelled
    ? `Images are visually attached for analysis. Use these exact URLs in <img src> tags where they suit this section (identify what each depicts):\n${labelled}`
    : "No images available — use CSS gradients and bold typography.";

  const prevHtml = previousSectionsHtml.length > 3000
    ? "...(earlier sections)...\n" + previousSectionsHtml.slice(-3000)
    : previousSectionsHtml;

  return `## CSS Design System (shared across all sections — use freely, do not redefine)

${plan.cssDesignSystem}

## Page context
Title: ${plan.pageTitle}
Goal: ${plan.conversionGoal}
Primary CTA: "${plan.primaryCtaText}"
Company: ${brandContext.companyName ?? "Unknown"}${brandContext.contactInfo.phone ? `\nPhone: ${brandContext.contactInfo.phone}` : ""}

${prevHtml ? `## Previously generated sections (match their visual quality and style)\n${prevHtml}\n` : ""}
## Your section: ${section.name}
Angle: ${section.angle}

Content to include (use all of these — be specific, not generic):
${section.contentItems.map((item) => `  - ${item}`).join("\n")}
${section.layoutHint ? `\nLayout hint: ${section.layoutHint}` : ""}

${imagery}

Generate the ${section.name} section now. Make it exceptional.`;
}

// ── Plan landing page ─────────────────────────────────────────────────────────

async function planLandingPage(opts: GenerateLPOptions): Promise<LPPagePlan> {
  const anthropic = await getAnthropicClient();

  const imageBlocks = await buildImageBlocks(opts.brandContext.imageryUrls, opts.uploadedImageUrls, 8);
  const planPrompt = buildLPPlanUserPrompt(opts);
  const userContent = imageBlocks.length
    ? [...imageBlocks, { type: "text" as const, text: planPrompt }]
    : planPrompt;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: PLAN_MAX_TOKENS,
    system: LP_PLAN_SYSTEM_PROMPT,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: [{ role: "user", content: userContent as any }],
  });

  const raw = response.content[0]?.type === "text" ? response.content[0].text : "";

  const metaMatch = raw.match(/<PAGE_META>([\s\S]*?)<\/PAGE_META>/);
  const cssMatch = raw.match(/<CSS>([\s\S]*?)<\/CSS>/);
  const stickyMatch = raw.match(/<STICKY_BAR>([\s\S]*?)<\/STICKY_BAR>/);
  const sectionsMatch = raw.match(/<SECTIONS>([\s\S]*?)<\/SECTIONS>/);

  if (!metaMatch || !cssMatch || !stickyMatch || !sectionsMatch) {
    throw new Error(
      `[lp-generator/plan] Response missing required tags. Got: ${raw.slice(0, 300)}`,
    );
  }

  const meta = JSON.parse(metaMatch[1].trim()) as Pick<
    LPPagePlan,
    "pageTitle" | "metaDescription" | "conversionGoal" | "primaryCtaText"
  >;
  const sections = JSON.parse(sectionsMatch[1].trim()) as LPSectionPlan[];
  const cssDesignSystem = cssMatch[1].trim();
  const stickyBarHtml = stickyMatch[1].trim();

  // Hard cap at 8 sections to stay within the 300 s route timeout
  return { ...meta, cssDesignSystem, stickyBarHtml, sections: sections.slice(0, 8) };
}

// ── Generate one section ──────────────────────────────────────────────────────

async function generateSectionHtml(params: {
  plan: LPPagePlan;
  section: LPSectionPlan;
  previousSectionsHtml: string;
  brandContext: BrandContext;
  uploadedImageUrls?: string[];
}): Promise<string> {
  const anthropic = await getAnthropicClient();

  // 4 images max per section — keeps token budget predictable
  const imageBlocks = await buildImageBlocks(params.brandContext.imageryUrls, params.uploadedImageUrls, 4);
  const sectionPrompt = buildSectionUserPrompt(params);
  const userContent = imageBlocks.length
    ? [...imageBlocks, { type: "text" as const, text: sectionPrompt }]
    : sectionPrompt;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: SECTION_MAX_TOKENS,
    system: SECTION_SYSTEM_PROMPT,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: [{ role: "user", content: userContent as any }],
  });

  const text = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
  return stripMarkdownFences(text);
}

// ── Assemble final page ───────────────────────────────────────────────────────

function escapeAttr(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function assemblePageFromSections(plan: LPPagePlan, sectionHtmls: string[]): string {
  // Hoist all <style> blocks from section HTML into <head>
  const sectionStyleBlocks: string[] = [];
  const strippedSections = sectionHtmls.map((html) =>
    html
      .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_m, css: string) => {
        sectionStyleBlocks.push(css.trim());
        return "";
      })
      .trim(),
  );

  const fullCss = [plan.cssDesignSystem, ...sectionStyleBlocks].join("\n\n");
  const sectionsBody = strippedSections.join("\n\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>${escapeAttr(plan.pageTitle)}</title>
<meta name="description" content="${escapeAttr(plan.metaDescription)}">
<style>
${fullCss}
</style>
</head>
<body>
${plan.stickyBarHtml}

${sectionsBody}

<script>
  // Scroll reveal
  (function(){
    var els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('visible'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function(el){ io.observe(el); });
  })();
  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click', function(e){
      var t = document.querySelector(this.getAttribute('href'));
      if(t){ e.preventDefault(); window.scrollTo({ top: t.getBoundingClientRect().top + window.pageYOffset - 70, behavior: 'smooth' }); }
    });
  });
  // FAQ accordion (if present)
  document.querySelectorAll('.faq-question').forEach(function(btn){
    btn.addEventListener('click', function(){
      var item = this.closest('.faq-item');
      if(!item) return;
      var wasOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(function(i){ i.classList.remove('open'); });
      if(!wasOpen) item.classList.add('open');
    });
  });
</script>
</body>
</html>`;
}

// ── Section-by-section orchestrator ──────────────────────────────────────────

/**
 * Generates a landing page in three phases for dramatically higher quality:
 *
 * 1. Plan — one call decides section structure, writes the CSS design system
 *    and sticky bar, and records a specific angle + content list per section.
 * 2. Sections — one call per section (max 8), each with its own 8 K-token
 *    budget and the visual context of previously generated sections.
 * 3. Assembly — CSS is consolidated into <head>, sections stitched together.
 *
 * Falls back to generateLandingPage() silently if the plan call fails.
 */
export async function generateLandingPageSectionBySection(
  opts: GenerateLPOptions & { onProgress?: (msg: string) => Promise<void> | void },
): Promise<string> {
  const { onProgress, ...genOpts } = opts;

  // Phase 1 — Plan
  if (onProgress) await onProgress("Planning page structure and design system...");
  let plan: LPPagePlan;
  try {
    plan = await planLandingPage(genOpts);
    console.log(
      `[lp-generator] Plan complete: ${plan.sections.length} sections — ${plan.sections.map((s) => s.name).join(", ")}`,
    );
  } catch (err) {
    console.warn("[lp-generator] Planning failed, falling back to single-call generation:", err);
    return generateLandingPage(genOpts);
  }

  // Phase 2 — Generate all sections in parallel so total wall-clock time is
  // ~max(section_times) rather than sum(section_times). With 7+ sections each
  // taking 25-40 s sequentially the route would bust the 300 s Vercel limit.
  // The previousSectionsHtml context hint is dropped here because it requires
  // sequential ordering; all sections share the CSS design system, which gives
  // sufficient visual coherence without the sequential dependency.
  if (onProgress) await onProgress(`Generating ${plan.sections.length} sections in parallel...`);

  const sectionResults = await Promise.allSettled(
    plan.sections.map((section) =>
      generateSectionHtml({
        plan,
        section,
        previousSectionsHtml: "", // parallel — no sequential dependency
        brandContext: genOpts.brandContext,
        uploadedImageUrls: genOpts.uploadedImageUrls,
      }).then((html) => {
        console.log(`[lp-generator] Section "${section.name}" complete (${html.length} chars)`);
        return html;
      }),
    ),
  );

  // Preserve original section order; skip any that failed
  const sectionHtmls: string[] = [];
  for (let i = 0; i < sectionResults.length; i++) {
    const result = sectionResults[i];
    if (result.status === "fulfilled") {
      sectionHtmls.push(result.value);
    } else {
      console.warn(`[lp-generator] Section "${plan.sections[i].name}" failed, skipping:`, result.reason);
    }
  }

  if (sectionHtmls.length === 0) {
    console.warn("[lp-generator] All section generations failed, falling back to single-call.");
    return generateLandingPage(genOpts);
  }

  // Phase 3 — Assemble
  if (onProgress) await onProgress("Assembling final page...");
  let html = assemblePageFromSections(plan, sectionHtmls);

  // Phase 4 — CRO self-critique and targeted refinement pass
  // Critique the assembled page across 10 CRO dimensions and apply the top
  // high/medium-severity fixes in a single refinement call. This replaces
  // the need to manually prompt for improvements in the chat after generation.
  try {
    if (onProgress) await onProgress("Running CRO self-critique...");
    const critique = await critiqueLandingPage({
      html,
      brief: genOpts.brief,
      campaignType: genOpts.campaignType,
      brandContext: genOpts.brandContext,
      targetAudience: genOpts.targetAudience,
    });

    const actionable = critique
      .filter((c) => c.severity === "high" || c.severity === "medium")
      .slice(0, 5);

    if (actionable.length > 0) {
      const severityRank = { high: 0, medium: 1, low: 2 } as const;
      actionable.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

      console.log(
        `[lp-generator] CRO critique: ${critique.length} issues found, applying ${actionable.length} fixes — ` +
          actionable.map((c) => `[${c.severity}] ${c.area}`).join(", "),
      );

      if (onProgress) {
        await onProgress(`Applying ${actionable.length} CRO improvements...`);
      }

      const instructions = actionable
        .map((item, idx) => `${idx + 1}. [${item.area}] ${item.fix}`)
        .join("\n");

      html = await refineLandingPage({
        currentHtml: html,
        brandContext: genOpts.brandContext,
        prompt: `Apply the following targeted CRO improvements identified by a self-critique pass. Each is a small, specific change — do not rewrite anything not mentioned.\n\n${instructions}`,
      });
    } else {
      console.log("[lp-generator] CRO critique: no high/medium issues found, skipping refinement.");
    }
  } catch (err) {
    console.warn("[lp-generator] CRO critique pass failed (keeping assembled version):", err);
  }

  return html;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function stripMarkdownFences(text: string): string {
  // Remove ```html ... ``` or ``` ... ``` wrapping
  const fenceMatch = text.match(/^```(?:html)?\s*\n([\s\S]+?)\n```$/);
  if (fenceMatch) return fenceMatch[1].trim();

  // Also handle case where fences appear at start/end
  let cleaned = text;
  if (cleaned.startsWith("```html")) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
  if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);

  return cleaned.trim();
}
