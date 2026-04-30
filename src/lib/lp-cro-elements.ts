/**
 * CRO Element Registry — a catalogue of named conversion tactics that the
 * LP planner and CRO auditor are made aware of.
 *
 * Each entry is a plain-English description with no code — the AI is free to
 * implement and style each tactic however it sees fit for the brand and sector.
 *
 * "detectHints" are lowercase keywords/attribute substrings used to heuristically
 * infer whether the element is already present in generated HTML.  The AI makes
 * the final call on whether what was detected is actually effective.
 */

export interface CroElement {
  id: string;
  name: string;
  /** One-sentence plain-English description fed directly into AI prompts. */
  description: string;
  /** Which campaign types benefit from this element. "all" matches every type. */
  campaignTypes: ("lead-gen" | "event" | "product-launch" | "service" | "ecommerce" | "all")[];
  /** Lowercase HTML substrings that suggest the element is already present. */
  detectHints: string[];
  /** high = auditor should flag as missing if absent; medium = worth considering */
  priority: "high" | "medium";
}

export const CRO_ELEMENTS: CroElement[] = [
  {
    id: "countdown-timer",
    name: "Countdown Timer",
    description:
      "A visible live countdown (days / hours / minutes / seconds) ticking down to a deadline, offer expiry, or event start date — creates urgency and reduces procrastination.",
    campaignTypes: ["event", "lead-gen", "product-launch", "ecommerce"],
    detectHints: ["countdown", "data-countdown", "data-deadline", "time-remaining", "timer"],
    priority: "high",
  },
  {
    id: "spots-remaining",
    name: "Spots / Stock Remaining",
    description:
      "A dynamic or static scarcity indicator — e.g. \"Only 4 places left\", \"3 of 20 spots filled\", or a partially filled progress bar — that signals limited availability and drives immediate action.",
    campaignTypes: ["event", "lead-gen", "product-launch"],
    detectHints: ["spots remaining", "places left", "spaces left", "seats remaining", "limited places", "only ", " left"],
    priority: "high",
  },
  {
    id: "risk-reversal",
    name: "Risk Reversal / Guarantee",
    description:
      "An explicit removal of buyer risk — e.g. a money-back guarantee, free cancellation promise, no-commitment trial, or \"no-questions-asked\" refund — displayed prominently near the primary CTA to eliminate hesitation.",
    campaignTypes: ["lead-gen", "service", "ecommerce", "product-launch"],
    detectHints: ["guarantee", "money back", "money-back", "cancel anytime", "no commitment", "risk-free", "risk free", "refund", "no-questions"],
    priority: "high",
  },
  {
    id: "social-proof-count",
    name: "Social Proof Count",
    description:
      "Prominent numeric social proof displayed early — e.g. \"4,200+ students enrolled\", \"Trusted by 300 businesses\", \"★ 4.9 from 180 reviews\" — that validates popularity and builds instant trust.",
    campaignTypes: ["all"],
    detectHints: ["trusted by", "students enrolled", "customers", "reviews", "rated", "★", "stars", "testimonials"],
    priority: "high",
  },
  {
    id: "urgency-banner",
    name: "Urgency Banner / Announcement Bar",
    description:
      "A bold sticky or top-of-page banner communicating a time-sensitive message — e.g. \"Enrolment closes Friday\", \"Early-bird pricing ends midnight\", \"Limited availability — book now\" — that frames the entire page with urgency.",
    campaignTypes: ["event", "product-launch", "ecommerce", "lead-gen"],
    detectHints: ["announcement", "banner", "closes", "ends midnight", "early-bird", "early bird", "limited availability", "book now"],
    priority: "high",
  },
  {
    id: "form-above-fold",
    name: "Lead Form Above the Fold",
    description:
      "The primary lead capture form (or at minimum a name + email field with a CTA button) visible without scrolling on desktop — removes friction for high-intent visitors who are ready to act immediately.",
    campaignTypes: ["lead-gen"],
    detectHints: ["<form", "data-lp-form"],
    priority: "high",
  },
  {
    id: "trust-badges",
    name: "Trust Badges / Accreditation Logos",
    description:
      "A horizontal strip of recognisable third-party trust signals — industry accreditations, payment security logos, media features, certification badges — that reduce scepticism and signal legitimacy.",
    campaignTypes: ["ecommerce", "service", "lead-gen", "product-launch"],
    detectHints: ["accredited", "certified", "badge", "trust", "featured in", "as seen in", "ssl", "secure"],
    priority: "medium",
  },
  {
    id: "video-embed",
    name: "Video Testimonial or Demo",
    description:
      "An embedded video — either a genuine customer testimonial, a product walkthrough, or a founder/team message — that builds emotional connection and keeps visitors engaged far longer than text alone.",
    campaignTypes: ["service", "product-launch", "lead-gen"],
    detectHints: ["<video", "youtube.com", "youtu.be", "vimeo.com", "iframe", "video-container", "watch"],
    priority: "medium",
  },
  {
    id: "comparison-table",
    name: "Comparison Table",
    description:
      "A side-by-side table comparing this offer against the competition or against doing nothing — makes the value proposition concrete and helps undecided buyers rationalise the decision.",
    campaignTypes: ["service", "product-launch", "ecommerce"],
    detectHints: ["comparison", "compare", "vs ", "versus", "<table", "competitor"],
    priority: "medium",
  },
  {
    id: "before-after",
    name: "Before / After",
    description:
      "A visual or copy-driven before/after contrast showing the transformation the customer can expect — extremely effective for service and product categories where outcomes are tangible.",
    campaignTypes: ["service", "ecommerce"],
    detectHints: ["before", "after", "transformation", "results", "before-after", "before/after"],
    priority: "medium",
  },
  {
    id: "offer-box",
    name: "Highlighted Offer Box",
    description:
      "A visually distinct panel — often with a contrasting background, border, or \"deal\" badge — that packages the specific offer clearly: what's included, the price (or savings), and the CTA, all in one scannable block.",
    campaignTypes: ["ecommerce", "product-launch", "lead-gen", "event"],
    detectHints: ["offer", "deal", "package", "what's included", "what you get", "includes", "pricing"],
    priority: "medium",
  },
  {
    id: "live-activity-feed",
    name: "Live Activity / Recent Conversions Feed",
    description:
      "A small notification-style pop-up or inline ticker showing real-time or recent activity — e.g. \"Sarah from Manchester just booked\", \"12 people viewing this page\" — that creates FOMO and social validation.",
    campaignTypes: ["lead-gen", "event", "ecommerce"],
    detectHints: ["just booked", "just signed up", "people viewing", "recently", "activity", "notification", "fomo"],
    priority: "medium",
  },
  {
    id: "progress-indicator",
    name: "Multi-Step Form with Progress Bar",
    description:
      "Breaking a long lead form into 2–3 steps with a visible progress bar — reduces perceived effort, increases completion rates, and allows qualification questions to come after initial commitment.",
    campaignTypes: ["lead-gen"],
    detectHints: ["step 1", "step 2", "progress", "multi-step", "next step", "data-step"],
    priority: "medium",
  },
  {
    id: "sticky-cta-bar",
    name: "Sticky CTA Bar",
    description:
      "A bar that sticks to the top or bottom of the viewport as the user scrolls, always keeping the primary CTA (and optionally phone number) in view — eliminates the need to scroll back to convert.",
    campaignTypes: ["all"],
    detectHints: ["sticky", "position: fixed", "position:fixed", "sticky-bar", "fixed-bar"],
    priority: "medium",
  },
  {
    id: "exit-intent-offer",
    name: "Exit-Intent / Scroll-Triggered Offer",
    description:
      "A modal, slide-in, or inline section triggered when a user shows exit intent or reaches a certain scroll depth — presents a last-chance offer, lead magnet, or reduced commitment option to rescue abandoning visitors.",
    campaignTypes: ["lead-gen", "ecommerce", "product-launch"],
    detectHints: ["exit-intent", "exitintent", "mouseleave", "scroll-trigger", "last chance", "wait", "before you go"],
    priority: "medium",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns all CRO elements relevant for a given campaign type,
 * ordered high-priority first.
 */
export function getCroElementsForCampaign(campaignType: string): CroElement[] {
  return CRO_ELEMENTS.filter(
    (el) => el.campaignTypes.includes("all") || el.campaignTypes.includes(campaignType as CroElement["campaignTypes"][number]),
  ).sort((a, b) => (a.priority === "high" ? -1 : 1) - (b.priority === "high" ? -1 : 1));
}

/**
 * Heuristically detect which CRO elements are already present in the HTML
 * and which are absent.  The AI makes the final quality judgement — this
 * just seeds the audit prompt with a baseline so the auditor doesn't have
 * to discover everything from first principles.
 */
export function detectPresentElements(
  html: string,
  elements: CroElement[],
): { present: CroElement[]; missing: CroElement[] } {
  const lower = html.toLowerCase();
  const present: CroElement[] = [];
  const missing: CroElement[] = [];

  for (const el of elements) {
    const found = el.detectHints.some((hint) => lower.includes(hint.toLowerCase()));
    (found ? present : missing).push(el);
  }

  return { present, missing };
}

/**
 * Build the CRO element section injected into the LP planning prompt.
 * Only high-priority elements are included to avoid overwhelming the planner.
 */
export function buildPlannerCroBlock(campaignType: string): string {
  const elements = getCroElementsForCampaign(campaignType).filter((el) => el.priority === "high");
  if (!elements.length) return "";

  const lines = elements.map((el) => `• **${el.name}** — ${el.description}`).join("\n");
  return `## Recommended CRO elements for ${campaignType} campaigns
Consider including these high-impact conversion tactics. Each is a suggestion — implement and style as fits the design and content:

${lines}

Do not force any element that doesn't fit the brief. If you include one, ensure it uses real, specific content (not placeholder text).`;
}

/**
 * Build the CRO element checklist injected into the CRO audit prompt.
 * Includes both high and medium priority elements.
 */
export function buildAuditCroBlock(campaignType: string, html: string): string {
  const elements = getCroElementsForCampaign(campaignType);
  if (!elements.length) return "";

  const { present, missing } = detectPresentElements(html, elements);

  const presentStr = present.length
    ? present.map((el) => `  ✓ ${el.name}`).join("\n")
    : "  (none detected)";

  const missingStr = missing.length
    ? missing.map((el) => `  ✗ ${el.name} [${el.priority}] — ${el.description}`).join("\n")
    : "  (all recommended elements detected)";

  return `## CRO element checklist for ${campaignType} campaigns
The following elements are recommended for this campaign type.

DETECTED (likely present):
${presentStr}

NOT DETECTED (potentially missing):
${missingStr}

For each NOT DETECTED element: use your judgement — if it would genuinely lift conversion for this specific page and brief, raise it as a high or medium severity issue with a concrete implementation instruction. Do not flag elements that are genuinely inappropriate for this context.`;
}
