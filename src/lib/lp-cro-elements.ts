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

export type CroCategory = "urgency" | "proof" | "offer" | "mechanics";

export const CRO_CATEGORY_LABELS: Record<CroCategory, string> = {
  urgency: "Urgency & scarcity",
  proof: "Social proof & trust",
  offer: "Offer & value framing",
  mechanics: "Conversion mechanics",
};

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
  /** Used to group elements in the form's component picker. */
  category: CroCategory;
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
    category: "urgency",
  },
  {
    id: "spots-remaining",
    name: "Spots / Stock Remaining",
    description:
      "A dynamic or static scarcity indicator — e.g. \"Only 4 places left\", \"3 of 20 spots filled\", or a partially filled progress bar — that signals limited availability and drives immediate action.",
    campaignTypes: ["event", "lead-gen", "product-launch"],
    detectHints: ["spots remaining", "places left", "spaces left", "seats remaining", "limited places", "only ", " left"],
    priority: "high",
    category: "urgency",
  },
  {
    id: "risk-reversal",
    name: "Risk Reversal / Guarantee",
    description:
      "An explicit removal of buyer risk — e.g. a money-back guarantee, free cancellation promise, no-commitment trial, or \"no-questions-asked\" refund — displayed prominently near the primary CTA to eliminate hesitation.",
    campaignTypes: ["lead-gen", "service", "ecommerce", "product-launch"],
    detectHints: ["guarantee", "money back", "money-back", "cancel anytime", "no commitment", "risk-free", "risk free", "refund", "no-questions"],
    priority: "high",
    category: "proof",
  },
  {
    id: "social-proof-count",
    name: "Social Proof Count",
    description:
      "Prominent numeric social proof displayed early — e.g. \"4,200+ students enrolled\", \"Trusted by 300 businesses\", \"★ 4.9 from 180 reviews\" — that validates popularity and builds instant trust.",
    campaignTypes: ["all"],
    detectHints: ["trusted by", "students enrolled", "customers", "reviews", "rated", "★", "stars", "testimonials"],
    priority: "high",
    category: "proof",
  },
  {
    id: "urgency-banner",
    name: "Urgency Banner / Announcement Bar",
    description:
      "A bold sticky or top-of-page banner communicating a time-sensitive message — e.g. \"Enrolment closes Friday\", \"Early-bird pricing ends midnight\", \"Limited availability — book now\" — that frames the entire page with urgency.",
    campaignTypes: ["event", "product-launch", "ecommerce", "lead-gen"],
    detectHints: ["announcement", "banner", "closes", "ends midnight", "early-bird", "early bird", "limited availability", "book now"],
    priority: "high",
    category: "urgency",
  },
  {
    id: "form-above-fold",
    name: "Lead Form Above the Fold",
    description:
      "The primary lead capture form (or at minimum a name + email field with a CTA button) visible without scrolling on desktop — removes friction for high-intent visitors who are ready to act immediately.",
    campaignTypes: ["lead-gen"],
    detectHints: ["<form", "data-lp-form"],
    priority: "high",
    category: "mechanics",
  },
  {
    id: "trust-badges",
    name: "Trust Badges / Accreditation Logos",
    description:
      "A horizontal strip of recognisable third-party trust signals — industry accreditations, payment security logos, media features, certification badges — that reduce scepticism and signal legitimacy.",
    campaignTypes: ["ecommerce", "service", "lead-gen", "product-launch"],
    detectHints: ["accredited", "certified", "badge", "trust", "featured in", "as seen in", "ssl", "secure"],
    priority: "medium",
    category: "proof",
  },
  {
    id: "video-embed",
    name: "Video Testimonial or Demo",
    description:
      "An embedded video — either a genuine customer testimonial, a product walkthrough, or a founder/team message — that builds emotional connection and keeps visitors engaged far longer than text alone.",
    campaignTypes: ["service", "product-launch", "lead-gen"],
    detectHints: ["<video", "youtube.com", "youtu.be", "vimeo.com", "iframe", "video-container", "watch"],
    priority: "medium",
    category: "proof",
  },
  {
    id: "comparison-table",
    name: "Comparison Table",
    description:
      "A side-by-side table comparing this offer against the competition or against doing nothing — makes the value proposition concrete and helps undecided buyers rationalise the decision.",
    campaignTypes: ["service", "product-launch", "ecommerce"],
    detectHints: ["comparison", "compare", "vs ", "versus", "<table", "competitor"],
    priority: "medium",
    category: "offer",
  },
  {
    id: "before-after",
    name: "Before / After",
    description:
      "A visual or copy-driven before/after contrast showing the transformation the customer can expect — extremely effective for service and product categories where outcomes are tangible.",
    campaignTypes: ["service", "ecommerce"],
    detectHints: ["before", "after", "transformation", "results", "before-after", "before/after"],
    priority: "medium",
    category: "offer",
  },
  {
    id: "offer-box",
    name: "Highlighted Offer Box",
    description:
      "A visually distinct panel — often with a contrasting background, border, or \"deal\" badge — that packages the specific offer clearly: what's included, the price (or savings), and the CTA, all in one scannable block.",
    campaignTypes: ["ecommerce", "product-launch", "lead-gen", "event"],
    detectHints: ["offer", "deal", "package", "what's included", "what you get", "includes", "pricing"],
    priority: "medium",
    category: "offer",
  },
  {
    id: "live-activity-feed",
    name: "Live Activity / Recent Conversions Feed",
    description:
      "A small notification-style pop-up or inline ticker showing real-time or recent activity — e.g. \"Sarah from Manchester just booked\", \"12 people viewing this page\" — that creates FOMO and social validation.",
    campaignTypes: ["lead-gen", "event", "ecommerce"],
    detectHints: ["just booked", "just signed up", "people viewing", "recently", "activity", "notification", "fomo"],
    priority: "medium",
    category: "urgency",
  },
  {
    id: "progress-indicator",
    name: "Multi-Step Form with Progress Bar",
    description:
      "Breaking a long lead form into 2–3 steps with a visible progress bar — reduces perceived effort, increases completion rates, and allows qualification questions to come after initial commitment.",
    campaignTypes: ["lead-gen"],
    detectHints: ["step 1", "step 2", "progress", "multi-step", "next step", "data-step"],
    priority: "medium",
    category: "mechanics",
  },
  {
    id: "sticky-cta-bar",
    name: "Sticky CTA Bar",
    description:
      "A bar that sticks to the top or bottom of the viewport as the user scrolls, always keeping the primary CTA (and optionally phone number) in view — eliminates the need to scroll back to convert.",
    campaignTypes: ["all"],
    detectHints: ["sticky", "position: fixed", "position:fixed", "sticky-bar", "fixed-bar"],
    priority: "medium",
    category: "mechanics",
  },
  {
    id: "exit-intent-offer",
    name: "Exit-Intent / Scroll-Triggered Offer",
    description:
      "A modal, slide-in, or inline section triggered when a user shows exit intent or reaches a certain scroll depth — presents a last-chance offer, lead magnet, or reduced commitment option to rescue abandoning visitors.",
    campaignTypes: ["lead-gen", "ecommerce", "product-launch"],
    detectHints: ["exit-intent", "exitintent", "mouseleave", "scroll-trigger", "last chance", "wait", "before you go"],
    priority: "medium",
    category: "urgency",
  },
  {
    id: "click-to-call",
    name: "Click-to-Call Phone Number",
    description:
      "A prominently displayed phone number with an `href=\"tel:...\"` link — ideally shown in the header, hero, and final CTA section. For service and local businesses this is one of the highest-converting elements on the page, capturing visitors who prefer to talk before committing.",
    campaignTypes: ["service", "lead-gen", "event"],
    detectHints: ["tel:", "href=\"tel", "href='tel", "click-to-call", "phone"],
    priority: "high",
    category: "mechanics",
  },
  {
    id: "price-anchoring",
    name: "Price Anchoring / Was–Now Pricing",
    description:
      "The original or higher price is shown crossed out beside the current price — e.g. ~~£499~~ £299 — or a 'saving' callout is displayed. Anchoring the higher number first makes the actual price feel like a deal and increases perceived value.",
    campaignTypes: ["ecommerce", "product-launch", "event"],
    detectHints: ["was ", "save ", "line-through", "text-decoration: line", "strikethrough", "original-price", "~~"],
    priority: "high",
    category: "offer",
  },
  {
    id: "two-step-optin",
    name: "Two-Step Opt-In (Click-to-Reveal Form)",
    description:
      "The primary CTA button does not submit a form — it reveals a short form in a modal or expands an inline form. The first click acts as a micro-commitment that significantly increases form completion rates versus showing the form upfront.",
    campaignTypes: ["lead-gen"],
    detectHints: ["data-toggle", "show-form", "reveal-form", "two-step", "twostep", "openModal", "open-modal"],
    priority: "medium",
    category: "mechanics",
  },
  {
    id: "hero-secondary-cta",
    name: "Hero Secondary CTA / Alternative Action",
    description:
      "A lower-commitment secondary option sits directly beneath the primary CTA — e.g. 'or call us on 0800 123 456', 'See how it works ↓', 'Download the brochure' — captures visitors not ready for the main action without diluting the primary conversion.",
    campaignTypes: ["all"],
    detectHints: ["secondary-cta", "or call", "see how", "learn more", "find out more", "watch the video"],
    priority: "medium",
    category: "mechanics",
  },
  {
    id: "trust-policy-icons",
    name: "Privacy / GDPR Trust Icons",
    description:
      "Small icons or lines near the lead form stating data handling commitments — e.g. a padlock with 'Your details are safe with us', 'We never share your data', '100% spam-free' — directly reduce form abandonment caused by privacy anxiety.",
    campaignTypes: ["lead-gen", "ecommerce"],
    detectHints: ["gdpr", "spam-free", "privacy", "data safe", "padlock", "secure", "never share"],
    priority: "medium",
    category: "proof",
  },
  {
    id: "media-award-proof",
    name: "Award or Media Mention Strip",
    description:
      "Logos of publications, awards, or industry bodies that have featured or recognised the brand — e.g. 'As seen in:', 'Award-winning:', 'Featured in The Guardian' — placed early on the page to instantly elevate credibility.",
    campaignTypes: ["all"],
    detectHints: ["as seen in", "featured in", "award", "winner", "recognised", "media-strip", "press"],
    priority: "medium",
    category: "proof",
  },
  {
    id: "whatsapp-chat",
    name: "WhatsApp / Live Chat Entry Point",
    description:
      "A floating WhatsApp button or live chat widget that gives visitors an instant low-friction way to ask a question before committing — particularly effective for higher-ticket services and event bookings where people have pre-sale questions.",
    campaignTypes: ["service", "lead-gen", "event"],
    detectHints: ["whatsapp", "wa.me", "tawk.to", "intercom", "crisp", "livechat", "chat-widget", "floating-chat"],
    priority: "medium",
    category: "mechanics",
  },
  {
    id: "embedded-map",
    name: "Embedded Location Map",
    description:
      "A Google Maps embed or address block with a map pin — important for local services, events, and any offer where physical presence matters. Grounds the brand in the real world and removes the 'where exactly is this?' hesitation.",
    campaignTypes: ["event", "service"],
    detectHints: ["google.com/maps", "maps.google", "maps/embed", "iframe", "location", "find us", "how to find"],
    priority: "medium",
    category: "mechanics",
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
 * Build a planner block listing the components the user explicitly flagged
 * as "would like to see considered". The AI is told to evaluate fit and
 * include only those that genuinely serve the brief — never to force them.
 */
export function buildUserRequestedCroBlock(ids: string[]): string {
  if (!ids?.length) return "";
  const elements = ids
    .map((id) => CRO_ELEMENTS.find((el) => el.id === id))
    .filter((el): el is CroElement => Boolean(el));
  if (!elements.length) return "";

  const lines = elements.map((el) => `• **${el.name}** — ${el.description}`).join("\n");
  return `## Components the user has flagged for consideration
The user has specifically asked you to consider the following components for this page. Treat each as a candidate, not a requirement: include any that genuinely fit the brief, target offering and audience; skip the rest without comment. Quality of fit beats quantity — never force one in:

${lines}`;
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
