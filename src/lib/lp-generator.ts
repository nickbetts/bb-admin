/**
 * AI Landing Page generator — uses Anthropic Claude Sonnet to generate
 * and iteratively refine standalone, high-converting landing pages.
 *
 * Uses streaming for large HTML output (same pattern as content-strategy-generator).
 */

import { getAnthropicClient } from "@/lib/anthropic-client";
import type { BrandContext } from "@/lib/brand-extractor";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 16000;

// ── Types ────────────────────────────────────────────────────────────────────

export interface GenerateLPOptions {
  brief: string;
  campaignType: string; // "lead-gen" | "event" | "product-launch" | "service" | "ecommerce"
  brandContext: BrandContext;
  targetAudience?: string;
  templateHtml?: string; // If generating from a saved template
  additionalInstructions?: string;
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

// ── System prompts ───────────────────────────────────────────────────────────

function buildGenerateSystemPrompt(brandContext: BrandContext): string {
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
  if (pc && (pc.h1 || pc.headings.length || pc.ctaTexts.length || pc.bodyCopy.length)) {
    const parts: string[] = [];
    if (pc.metaTitle) parts.push(`Page title: ${pc.metaTitle}`);
    if (pc.metaDescription) parts.push(`Meta description: ${pc.metaDescription}`);
    if (pc.h1) parts.push(`H1: ${pc.h1}`);
    if (pc.headings.length) parts.push(`Section headings:\n${pc.headings.map((h) => `  - ${h}`).join("\n")}`);
    if (pc.ctaTexts.length) parts.push(`CTA button text: ${pc.ctaTexts.join(" | ")}`);
    if (pc.bodyCopy.length) parts.push(`Body copy samples:\n${pc.bodyCopy.map((p) => `  "${p}"`).join("\n")}`);
    pageCopyBlock = `\n## Existing website copy (use as reference for tone, terminology, and messaging)\n\n${parts.join("\n")}\n`;
  }

  return `You are an expert landing page designer, CRO specialist, and front-end developer.

Your task is to generate a complete, standalone HTML landing page that is ready to deploy. The output must be a single HTML file with ALL CSS inlined in a <style> block. No external dependencies except Google Fonts if needed.

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
${pageCopyBlock}
## Available imagery
${brandContext.imageryUrls.length ? brandContext.imageryUrls.slice(0, 6).map((u) => `- ${u}`).join("\n") : "No images available — use CSS gradients, patterns and emoji/icons for visual interest."}

## Technical Requirements

1. **Single HTML file** with inline <style> block. Use CSS custom properties (:root) for colours.
2. **Mobile-first responsive** — must look excellent on all screen sizes. Use flexbox and CSS grid.
3. **Semantic HTML** — proper heading hierarchy, ARIA labels where helpful, alt text on images.
4. **Fast loading** — no heavy frameworks. Minimal inline JS only if needed for interactions.
5. **Browser compatible** — modern browsers (no IE support needed).

## CRO Best Practices

1. **Clear value proposition** above the fold with a strong headline and sub-headline.
2. **Single primary CTA** repeated throughout the page (sticky nav CTA + section CTAs).
3. **Social proof** — testimonials, stats, trust badges, client logos section.
4. **Urgency/scarcity** if appropriate — countdown, limited availability.
5. **Minimal navigation** — no complex menus. Sticky nav with CTA only.
6. **Trust signals** — guarantees, certifications, security badges.
7. **Clear visual hierarchy** — use whitespace, contrast, and typography sizing.
8. **Benefit-led sections** — features framed as benefits to the user.

## Form Handling

Include a lead capture form if appropriate for the campaign type. The form MUST have:
- Attribute: data-lp-form="true" (this enables our form capture system)
- Standard fields: name (required), email (required), phone (optional), message (optional)
- A clear, benefit-oriented submit button (not just "Submit")
- The form action should be "#" — our JavaScript intercepts it

## HTML Structure

Follow this general section order (adapt as appropriate):
1. Sticky navigation bar (logo + phone + primary CTA button)
2. Urgency/announcement bar (if appropriate)
3. Hero section (headline, subtitle, CTA, optional hero image/video)
4. Social proof bar (stats, awards, ratings)
5. Benefits/features section (3-4 key benefits with icons)
6. How it works / process section
7. Testimonials section
8. Pricing or offer section (if relevant)
9. FAQ section (collapsible if using JS)
10. Final CTA section
11. Footer (contact info, legal, social links)

## CSS Style Guide

- Use :root CSS custom properties for all brand colours
- Consistent border-radius (use a --r variable)
- Consistent shadows (use --shadow variables)
- Smooth hover transitions (0.2s ease)
- Section padding: 60-80px vertical, responsive horizontal
- Max content width: ~1200px, centred

## Output Rules

- Return ONLY the complete HTML document. No markdown fences, no explanation text.
- Start with <!DOCTYPE html> and end with </html>.
- Do NOT include any placeholder text like "[Company Name]" — use the actual brand data provided.
- Make all copy compelling and conversion-focused.
- Use British English for all text.
- **Never use em dashes (— or &mdash;)**. Use a comma, colon, or rewrite the sentence instead.`;
}

const REFINE_SYSTEM_PROMPT = `You are an expert landing page designer iterating on an existing landing page.

The user will provide their current HTML and a change request. Apply the requested changes precisely while:

1. Preserving the overall brand identity (colours, fonts, logo, imagery)
2. Making minimal, targeted changes — don't rewrite sections that weren't mentioned
3. Maintaining responsive design and CRO best practices
4. Keeping all CSS inline in the <style> block
5. Preserving the data-lp-form="true" attribute on any forms

Return ONLY the complete updated HTML document. No markdown fences, no explanation.
Start with <!DOCTYPE html> and end with </html>.

Use British English for all text.
Never use em dashes (— or &mdash;). Use a comma, colon, or rewrite the sentence instead.`;

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

// ── Generate landing page ────────────────────────────────────────────────────

export async function generateLandingPage(opts: GenerateLPOptions): Promise<string> {
  const anthropic = await getAnthropicClient();

  const systemPrompt = buildGenerateSystemPrompt(opts.brandContext);

  let userPrompt = `Generate a landing page for the following campaign:\n\n`;
  userPrompt += `Campaign type: ${opts.campaignType}\n`;
  userPrompt += `Brief: ${opts.brief}\n`;
  if (opts.targetAudience) userPrompt += `Target audience: ${opts.targetAudience}\n`;
  if (opts.additionalInstructions) userPrompt += `\nAdditional instructions: ${opts.additionalInstructions}\n`;

  if (opts.templateHtml) {
    userPrompt += `\n## Template HTML\n\nUse this as a structural starting point — adapt the layout and style while replacing all placeholder content with real, campaign-specific content:\n\n${opts.templateHtml.slice(0, 30000)}`;
  }

  // Use streaming for large responses
  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const response = await stream.finalMessage();
  const block = response.content[0];
  let html = block.type === "text" ? block.text.trim() : "";

  // Strip markdown fences if Claude wraps output
  html = stripMarkdownFences(html);

  return html;
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
  let userContent = `Here is the current landing page HTML:\n\n${opts.currentHtml}\n\nBrand colours: ${colourSummary}\n\nPlease make the following changes:\n${opts.prompt}`;

  if (opts.referenceHtml) {
    userContent += `\n\n## Reference page for inspiration\nThe user has uploaded an HTML page they like. Use it for structural and feature inspiration only — preserve the current page's brand identity, colours, and all existing copy:\n\n${opts.referenceHtml.slice(0, 12000)}`;
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
- Be concise and specific. Focus on one key point per message.
- Use web search to find current landing page trends, layout patterns, CRO research, or industry-specific examples when relevant. Cite what you found.
- Ask a single clarifying question if you need more context before recommending.
- Reference the actual page content (headlines, CTAs, sections) when analysing.
- If the user has uploaded a reference page, note what specific features or patterns from it would benefit the current page.

## Action tags (output these on their own line at the end of your response)

Use READY_TO_APPLY when you have identified a single, specific change the user wants to implement right now:
  READY_TO_APPLY: <a clear, precise instruction Claude can use to update the HTML>

Use STACK_CHANGE when building up a list of agreed changes to implement all at once later. Output one tag per change — you can output multiple in a single response:
  STACK_CHANGE: <a clear, precise instruction Claude can use to update the HTML>

When a user says "yes", "good idea", "save that", "add it to the list", "stack that", or agrees with a suggestion, output a STACK_CHANGE tag for it. When the user wants to apply one thing immediately, use READY_TO_APPLY instead.

Never output both READY_TO_APPLY and STACK_CHANGE in the same response.

- Use British English. Never use em dashes (— or &mdash;). Use commas, colons, or rewrite instead.`;

export async function chatAboutLandingPage(opts: ChatLPOptions): Promise<ChatLPResponse> {
  const anthropic = await getAnthropicClient();

  const messages: { role: "user" | "assistant"; content: string }[] = [];

  // Include recent conversation history (last 8 turns — text only, cheap)
  if (opts.conversationHistory?.length) {
    messages.push(...opts.conversationHistory.slice(-8));
  }

  let userContent = `Here is the current landing page HTML (truncated to 15,000 chars for reference):\n\n${opts.currentHtml.slice(0, 15000)}\n\n${opts.message}`;

  if (opts.referenceHtml) {
    userContent += `\n\n## Reference page the user uploaded\n${opts.referenceHtml.slice(0, 8000)}`;
  }

  messages.push({ role: "user", content: userContent });

  // Use Anthropic's server-side web search tool so Claude can look up trends/layouts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const webSearchTool = { type: "web_search_20250305", name: "web_search", max_uses: 3 } as any;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: CHAT_SYSTEM_PROMPT,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: [webSearchTool] as any,
    messages,
  });

  // Web search produces multiple content blocks; find the last text block (Claude's final answer)
  const textBlocks = response.content.filter(
    (b): b is { type: "text"; text: string } => b.type === "text"
  );
  const raw = textBlocks.length > 0 ? textBlocks[textBlocks.length - 1].text.trim() : "";

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
