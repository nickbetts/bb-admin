/**
 * Design Element Registry — a catalogue of named visual design patterns that
 * the LP design & sector auditor is made aware of.
 *
 * Each entry describes a design technique in plain English. The AI uses these
 * to check whether the page employs sector-appropriate design tactics and to
 * flag specific improvements with concrete CSS/HTML instructions.
 *
 * "detectHints" are lowercase substrings searched in the HTML/CSS to
 * heuristically infer whether the element is already present.
 */

export interface DesignElement {
  id: string;
  name: string;
  /** Plain-English description fed directly into the AI audit prompt. */
  description: string;
  /**
   * Which sectors / campaign types particularly benefit from this element.
   * "all" matches every type.
   */
  campaignTypes: ("lead-gen" | "event" | "product-launch" | "service" | "ecommerce" | "all")[];
  /** Lowercase HTML/CSS substrings that suggest the element is present. */
  detectHints: string[];
  priority: "high" | "medium";
}

export const DESIGN_ELEMENTS: DesignElement[] = [
  {
    id: "scroll-reveal-animations",
    name: "Scroll-Reveal Entrance Animations",
    description:
      "Sections and cards that fade or slide into view as the user scrolls — using CSS classes like `.reveal` toggled by an IntersectionObserver — give the page energy and a polished, app-like feel without heavy JavaScript.",
    campaignTypes: ["all"],
    detectHints: ["reveal", "intersectionobserver", "fadeinup", "fade-in-up", "animate-on-scroll", "aos"],
    priority: "high",
  },
  {
    id: "bold-hero-typography",
    name: "Oversized Bold Hero Typography",
    description:
      "A hero H1 rendered at an unusually large scale (5rem–9rem on desktop) with tight letter-spacing and high font-weight — commands immediate attention, reduces time-to-value-prop, and signals confidence in the offer.",
    campaignTypes: ["all"],
    detectHints: ["font-size: 5", "font-size: 6", "font-size: 7", "font-size: 8", "font-size: 9", "clamp(", "font-weight: 900", "font-weight: 800"],
    priority: "high",
  },
  {
    id: "hover-microinteractions",
    name: "Hover Microinteractions",
    description:
      "Subtle CSS transitions on interactive elements — cards lifting with box-shadow, buttons scaling slightly, CTA arrows sliding right on hover — that reward user attention and signal quality craftsmanship.",
    campaignTypes: ["all"],
    detectHints: [":hover", "transition:", "transform:", "translatey", "box-shadow"],
    priority: "high",
  },
  {
    id: "full-bleed-hero-image",
    name: "Full-Bleed Hero Background Image",
    description:
      "The hero section uses a real photograph as a full-bleed background (not a flat colour or gradient) with a semi-transparent overlay for text legibility — grounds the page in the real world and builds instant brand credibility.",
    campaignTypes: ["all"],
    detectHints: ["background-image", "object-fit: cover", "object-fit:cover", "background-size: cover", "background-size:cover"],
    priority: "high",
  },
  {
    id: "section-colour-blocking",
    name: "Section Colour Blocking",
    description:
      "Alternating sections use distinct background colours drawn from the brand palette (dark → light → accent → dark) rather than a monotone white page — creates visual rhythm, separates content areas, and maintains engagement as users scroll.",
    campaignTypes: ["all"],
    detectHints: ["background: var(--", "background-color: var(--", "section-dark", "section-alt", "bg-dark", "bg-accent"],
    priority: "high",
  },
  {
    id: "diagonal-section-dividers",
    name: "Diagonal / Angled Section Dividers",
    description:
      "Sections separated by diagonal cuts using CSS `clip-path: polygon(...)` or SVG wave shapes rather than straight horizontal borders — adds dynamism, sector-specific energy (especially for sports, tech, events), and breaks the grid monotony.",
    campaignTypes: ["event", "product-launch", "lead-gen", "service"],
    detectHints: ["clip-path", "polygon(", "svg wave", "skewY", "skew("],
    priority: "medium",
  },
  {
    id: "glassmorphism-cards",
    name: "Glassmorphism / Frosted Glass Cards",
    description:
      "Cards with `backdrop-filter: blur()` and semi-transparent backgrounds layered over imagery or gradient backgrounds — creates depth and a premium feel, works especially well for tech, luxury, and professional services sectors.",
    campaignTypes: ["service", "product-launch", "lead-gen"],
    detectHints: ["backdrop-filter", "blur(", "rgba(255,255,255,0.", "rgba(255, 255, 255, 0."],
    priority: "medium",
  },
  {
    id: "card-depth-system",
    name: "Card Depth / Shadow Hierarchy",
    description:
      "A consistent shadow system where cards and interactive panels have layered box-shadows (combining a soft ambient shadow and a tighter direct shadow) to create the illusion of depth and elevation above the page surface.",
    campaignTypes: ["all"],
    detectHints: ["box-shadow:", "0 4px", "0 8px", "0 16px", "0 24px"],
    priority: "medium",
  },
  {
    id: "gradient-text",
    name: "Gradient Text on Key Phrases",
    description:
      "A CSS `background-clip: text` linear or radial gradient applied to a key word or phrase in the hero headline — creates a visually distinctive highlight that draws the eye to the most important part of the value proposition.",
    campaignTypes: ["product-launch", "service", "lead-gen", "event"],
    detectHints: ["background-clip: text", "background-clip:text", "-webkit-background-clip: text", "text-fill-color"],
    priority: "medium",
  },
  {
    id: "icon-accent-backgrounds",
    name: "Icon Accent Backgrounds",
    description:
      "Benefit or feature icons sit inside a small coloured circle or rounded square using the brand accent colour (e.g. `background: var(--accent); border-radius: 50%`) — consistent visual system that makes lists scannable and on-brand.",
    campaignTypes: ["all"],
    detectHints: ["border-radius: 50%", "border-radius:50%", "icon-wrap", "icon-bg", "icon-circle"],
    priority: "medium",
  },
  {
    id: "sticky-header-blur",
    name: "Sticky Header with Blur Backdrop",
    description:
      "The sticky navigation bar uses `backdrop-filter: blur()` combined with a semi-transparent background so the content beneath it is visible as the user scrolls — signals a modern, premium build quality.",
    campaignTypes: ["all"],
    detectHints: ["position: sticky", "position:sticky", "backdrop-filter", "sticky-bar"],
    priority: "medium",
  },
  {
    id: "testimonial-photo-cards",
    name: "Testimonial Cards with Real Photos",
    description:
      "Testimonial items include a circular avatar photograph of the reviewer (real image, not an initial/icon placeholder) alongside their name, role, and a specific result quote — dramatically increases the credibility of social proof.",
    campaignTypes: ["all"],
    detectHints: ["testimonial", "avatar", "border-radius: 50%", "reviewer", "review-photo"],
    priority: "medium",
  },
  {
    id: "numbered-process-steps",
    name: "Numbered Process / How It Works Steps",
    description:
      "A visually bold step sequence (large numerals 01/02/03 in brand colour, connected by a line or arrow) showing exactly what happens after the visitor converts — reduces anxiety about the unknown and makes commitment feel low-risk.",
    campaignTypes: ["lead-gen", "service", "product-launch"],
    detectHints: ["step-", "how-it-works", "process-step", "01", "02", "03"],
    priority: "medium",
  },
  {
    id: "stat-counter-display",
    name: "Large Stat / Counter Display",
    description:
      "Key proof points rendered as oversized bold numbers (e.g. 4,200+ / 98% / £2M) with a small label beneath — presented in a horizontal strip or grid — creates a visually punchy credibility section that is quick to scan.",
    campaignTypes: ["all"],
    detectHints: ["stat", "counter", "number-", "data-count", "metric"],
    priority: "medium",
  },
  {
    id: "cta-section-contrast",
    name: "High-Contrast Final CTA Section",
    description:
      "The final call-to-action section uses a dramatically different background from the body — a deep brand colour, a full-bleed image, or a bold gradient — to signal a clear chapter break and make the conversion moment feel significant.",
    campaignTypes: ["all"],
    detectHints: ["cta-section", "final-cta", "section-cta", "cta-dark", "cta-bg"],
    priority: "high",
  },
  {
    id: "split-section-layout",
    name: "Split-Section Layout (Text + Image Side-by-Side)",
    description:
      "Content sections alternate between text-left/image-right and text-right/image-left using CSS Grid or Flexbox — breaks the single-column monotony, gives each section breathing room, and allows photography to do the persuasive work alongside the copy.",
    campaignTypes: ["all"],
    detectHints: ["grid-cols-2", "split-section", "content-split", "flex-row", "image-left", "image-right", "two-col"],
    priority: "high",
  },
  {
    id: "logo-strip",
    name: "Client / Partner Logo Strip",
    description:
      "A horizontal strip of greyscale client, partner, or accreditation logos — typically displayed just below the hero or above the testimonials — that communicates legitimacy and scale through visual association with recognisable names.",
    campaignTypes: ["all"],
    detectHints: ["logo-strip", "client-logos", "partner-logos", "trusted-by", "filter: grayscale", "filter:grayscale"],
    priority: "high",
  },
  {
    id: "responsive-fluid-type",
    name: "Responsive Fluid Typography (CSS clamp)",
    description:
      "Headlines and body text scale fluidly between a minimum and maximum size using `clamp()` — e.g. `font-size: clamp(1.5rem, 4vw, 3rem)` — so the page reads beautifully at every viewport width without abrupt breakpoint jumps.",
    campaignTypes: ["all"],
    detectHints: ["clamp(", "vw)", "vmin)"],
    priority: "high",
  },
  {
    id: "custom-form-styling",
    name: "Custom-Styled Form Inputs",
    description:
      "Form inputs, selects, and checkboxes are fully styled to match the brand — custom border colours, focus rings in brand accent, branded placeholder text, and a styled submit button — rather than using default browser UI. This directly reduces perceived risk and increases form completion.",
    campaignTypes: ["lead-gen", "ecommerce"],
    detectHints: ["input[type", "input {", "::placeholder", "focus:border", "focus:ring", "form-control", "form-group"],
    priority: "high",
  },
  {
    id: "dark-hero-light-body",
    name: "Dark Hero / Light Body Contrast",
    description:
      "The hero and final CTA sections use a dark background (near-black or deep brand colour) with light text, while body sections use a light background — creates strong visual bookending that draws the eye to the conversion sections and makes the page feel premium.",
    campaignTypes: ["all"],
    detectHints: ["bg-dark", "hero-dark", "background: #1", "background: #0", "background:#1", "background:#0", "color: #fff", "color:#fff", "color: white"],
    priority: "high",
  },
  {
    id: "badge-overlay",
    name: "Ribbon / Badge Overlay on Cards",
    description:
      "Cards in pricing, package, or feature sections carry a small corner ribbon or pill badge — e.g. 'Most Popular', 'Best Value', 'Recommended', 'Early Bird' — that draws the eye to the preferred option and reduces decision paralysis.",
    campaignTypes: ["ecommerce", "product-launch", "event", "service"],
    detectHints: ["most popular", "best value", "recommended", "early bird", "ribbon", "badge", "popular"],
    priority: "medium",
  },
  {
    id: "floating-accent-shapes",
    name: "Floating Accent Shapes / Background Blobs",
    description:
      "Subtle decorative elements — blurred gradient blobs, dot grids, geometric outlines, or abstract shapes — positioned behind content sections using `position: absolute` and low opacity. Adds depth and brand personality without competing with the content.",
    campaignTypes: ["product-launch", "service", "lead-gen"],
    detectHints: ["blob", "shape-", "dot-grid", "bg-shape", "decorative", "position: absolute", "z-index: -", "z-index:-"],
    priority: "medium",
  },
  {
    id: "font-pairing",
    name: "Intentional Font Pairing (Display + Body)",
    description:
      "A distinct display or serif font for headlines paired with a clean sans-serif for body text — loaded via Google Fonts or a self-hosted variable font. The contrast between headline and body typefaces creates hierarchy and signals design intentionality.",
    campaignTypes: ["all"],
    detectHints: ["font-family", "@import url", "fonts.googleapis", "@font-face", "serif"],
    priority: "medium",
  },
  {
    id: "scroll-progress-indicator",
    name: "Page Scroll Progress Indicator",
    description:
      "A thin bar at the top of the viewport that fills as the user scrolls down the page — gives a sense of progress on long-form pages and subtly encourages visitors to keep reading to 'finish' the page.",
    campaignTypes: ["service", "product-launch", "lead-gen"],
    detectHints: ["scroll-progress", "progress-bar", "scrollY", "scrollTop", "data-progress"],
    priority: "medium",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getDesignElementsForCampaign(campaignType: string): DesignElement[] {
  return DESIGN_ELEMENTS.filter(
    (el) =>
      el.campaignTypes.includes("all") ||
      el.campaignTypes.includes(campaignType as DesignElement["campaignTypes"][number]),
  ).sort((a, b) => (a.priority === "high" ? -1 : 1) - (b.priority === "high" ? -1 : 1));
}

export function detectPresentDesignElements(
  html: string,
  elements: DesignElement[],
): { present: DesignElement[]; missing: DesignElement[] } {
  const lower = html.toLowerCase();
  const present: DesignElement[] = [];
  const missing: DesignElement[] = [];
  for (const el of elements) {
    const found = el.detectHints.some((hint) => lower.includes(hint.toLowerCase()));
    (found ? present : missing).push(el);
  }
  return { present, missing };
}

/**
 * Builds the design element present/missing checklist injected into the
 * design & sector audit prompt. Covers all priorities.
 */
export function buildDesignAuditBlock(campaignType: string, html: string): string {
  const elements = getDesignElementsForCampaign(campaignType);
  if (!elements.length) return "";

  const { present, missing } = detectPresentDesignElements(html, elements);

  const presentStr = present.length
    ? present.map((el) => `  ✓ ${el.name}`).join("\n")
    : "  (none detected)";

  const missingStr = missing.length
    ? missing.map((el) => `  ✗ ${el.name} [${el.priority}] — ${el.description}`).join("\n")
    : "  (all recommended elements detected)";

  return `## Design element checklist for ${campaignType} campaigns
The following visual design patterns are recommended for high-converting landing pages in this category.

DETECTED (likely present):
${presentStr}

NOT DETECTED (potentially missing):
${missingStr}

For each NOT DETECTED element: evaluate whether it would genuinely improve the visual quality or sector fit of this specific page. If yes, raise it as a high or medium severity issue with a concrete CSS/HTML instruction to implement it.`;
}
