/**
 * Copy Element Registry — a catalogue of named copywriting techniques that
 * the LP copy quality auditor is made aware of.
 *
 * Each entry describes a copy pattern in plain English. The AI uses these
 * to check whether the page employs proven direct-response techniques and to
 * flag specific rewrites or additions.
 *
 * "detectHints" are lowercase substrings searched in the visible text content
 * of the HTML to heuristically infer whether the technique is present.
 */

export interface CopyElement {
  id: string;
  name: string;
  /** Plain-English description fed directly into the AI audit prompt. */
  description: string;
  campaignTypes: ("lead-gen" | "event" | "product-launch" | "service" | "ecommerce" | "all")[];
  /** Lowercase substrings in rendered text/HTML that suggest the element is present. */
  detectHints: string[];
  priority: "high" | "medium";
}

export const COPY_ELEMENTS: CopyElement[] = [
  {
    id: "specific-outcome-headline",
    name: "Specific Outcome Headline",
    description:
      "The H1 names a concrete, measurable outcome the customer will achieve — not a vague brand tagline. E.g. 'Book Your Child's Place at Premier League Training Venues This Summer' rather than 'Excellence in Football Development'.",
    campaignTypes: ["all"],
    detectHints: ["<h1", "h1>"],
    priority: "high",
  },
  {
    id: "additive-subheadline",
    name: "Additive Sub-Headline",
    description:
      "The hero sub-headline (paragraph directly below H1) introduces genuinely new information — a supporting detail, a qualifying statement, or a secondary benefit — rather than restating the headline in different words.",
    campaignTypes: ["all"],
    detectHints: ["<p", "hero", "sub-headline", "subtitle"],
    priority: "high",
  },
  {
    id: "action-specific-cta",
    name: "Action-Specific CTA Copy",
    description:
      "Every primary CTA button uses outcome-oriented, first-person copy tied to the specific conversion action — e.g. 'Reserve My Place', 'Get My Free Quote', 'Book a Free Discovery Call' — not generic labels like 'Submit', 'Get Started', or 'Click Here'.",
    campaignTypes: ["all"],
    detectHints: ["reserve", "book my", "get my", "start my", "claim my", "secure my", "download my", "enrol", "sign me up"],
    priority: "high",
  },
  {
    id: "outcome-led-benefits",
    name: "Outcome-Led Benefits",
    description:
      "Benefits are written from the customer's perspective with a clear 'so what' — the transformation or result the customer gets, not a feature description. E.g. 'Leave with a full sales pipeline' not 'CRM integration included'.",
    campaignTypes: ["all"],
    detectHints: ["you'll", "you will", "your ", "leave with", "walk away", "gain ", "achieve ", "results"],
    priority: "high",
  },
  {
    id: "specific-numbered-proof",
    name: "Specific Numbered Social Proof",
    description:
      "Statistics and testimonial results use precise numbers rather than vague claims — '4,200 students enrolled' beats 'thousands of students'; '★ 4.9 from 180 verified reviews' beats 'highly rated'; '£2.3M in client revenue' beats 'significant results'.",
    campaignTypes: ["all"],
    detectHints: ["4,", "1,", "2,", "3,", "★", "stars", "%", "verified", "reviews"],
    priority: "high",
  },
  {
    id: "named-testimonial-with-result",
    name: "Named Testimonial with Specific Result",
    description:
      "At least one testimonial includes the reviewer's full name, a photo or identifier, their role/context, AND a specific before/after result or outcome — not just a vague positive sentiment quote like 'Great service, highly recommend'.",
    campaignTypes: ["all"],
    detectHints: ["testimonial", "review", "said:", "\u201c", "&ldquo;", "—"],
    priority: "high",
  },
  {
    id: "objection-faq",
    name: "Objection-Killing FAQ",
    description:
      "The FAQ section directly addresses the 3–5 most common hesitations a buyer in this sector has before committing — not generic questions like 'How do I contact you?', but real objections like 'What if my child has never played before?' or 'Can I cancel if plans change?'",
    campaignTypes: ["all"],
    detectHints: ["faq", "frequently asked", "question", "?</"],
    priority: "high",
  },
  {
    id: "genuine-urgency-copy",
    name: "Genuine Urgency / Scarcity Copy",
    description:
      "Urgency or scarcity language is grounded in a real constraint — an actual deadline date, a specific number of remaining places, or a genuine offer expiry — not manufactured phrases like 'Act now!' or 'Limited time offer' with no specifics.",
    campaignTypes: ["event", "lead-gen", "product-launch", "ecommerce"],
    detectHints: ["closes", "deadline", "expires", "limited to", "only ", " left", "places remaining", "enrolment"],
    priority: "high",
  },
  {
    id: "risk-removal-copy",
    name: "Risk-Removal Copy",
    description:
      "An explicit sentence or short paragraph near the primary CTA that names and removes the main risk of converting — e.g. 'No commitment required', 'Cancel any time, no questions asked', 'Full refund if you're not satisfied within 14 days'.",
    campaignTypes: ["lead-gen", "service", "ecommerce", "product-launch"],
    detectHints: ["no commitment", "cancel any", "money back", "money-back", "refund", "risk-free", "no obligation", "no contract"],
    priority: "high",
  },
  {
    id: "power-word-opening",
    name: "Power-Word Sentence Openers",
    description:
      "Body copy paragraphs and bullet points open with verbs or power words that pull the reader forward — 'Discover', 'Transform', 'Unlock', 'Join', 'Get access to', 'Build' — rather than passive constructions like 'We offer' or 'Our service provides'.",
    campaignTypes: ["all"],
    detectHints: ["discover", "unlock", "transform", "join ", "build ", "get access", "achieve"],
    priority: "medium",
  },
  {
    id: "short-sentence-rhythm",
    name: "Short-Sentence Rhythm",
    description:
      "Copy uses short punchy sentences (averaging under 15 words) mixed with deliberate one-liners for emphasis. Long multi-clause paragraphs are broken up. This increases scan-ability and pace, especially on mobile.",
    campaignTypes: ["all"],
    detectHints: ["<p", "<li"],
    priority: "medium",
  },
  {
    id: "sector-vocabulary",
    name: "Sector-Specific Vocabulary",
    description:
      "The copy uses the terminology, phrases, and insider language that the target audience uses themselves — e.g. a football camp uses 'grassroots football', 'match-day preparation', 'technical drills'; a SaaS product uses 'pipeline', 'churn', 'MRR'. Generic language that fits any business is a red flag.",
    campaignTypes: ["all"],
    detectHints: [],
    priority: "medium",
  },
  {
    id: "second-person-address",
    name: "Second-Person 'You' Address",
    description:
      "Copy speaks directly to the reader using 'you' and 'your' throughout — 'Your child will…', 'You'll get access to…' — rather than third-person descriptions of what customers get. Second person creates personal resonance and a one-to-one feel.",
    campaignTypes: ["all"],
    detectHints: ["you ", "your ", "you'll", "you're", "you've"],
    priority: "medium",
  },
  {
    id: "above-fold-value-prop",
    name: "Value Proposition Above the Fold",
    description:
      "The core value proposition — what the customer gets, who it's for, and why it's different — is fully communicated within the hero section visible without scrolling. A visitor should understand the offer within 3 seconds of landing.",
    campaignTypes: ["all"],
    detectHints: ["hero", "<h1", "above-fold"],
    priority: "medium",
  },
  {
    id: "ps-close",
    name: "P.S. / Final Reinforcement Copy",
    description:
      "A short P.S. line or final reinforcement sentence near the bottom CTA restates the single most compelling reason to act now — P.S. lines have high readership as scanners jump to the end, and they give hesitant readers one last nudge.",
    campaignTypes: ["lead-gen", "event", "product-launch"],
    detectHints: ["p.s.", "ps:", "p.s "],
    priority: "medium",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getCopyElementsForCampaign(campaignType: string): CopyElement[] {
  return COPY_ELEMENTS.filter(
    (el) =>
      el.campaignTypes.includes("all") ||
      el.campaignTypes.includes(campaignType as CopyElement["campaignTypes"][number]),
  ).sort((a, b) => (a.priority === "high" ? -1 : 1) - (b.priority === "high" ? -1 : 1));
}

export function detectPresentCopyElements(
  html: string,
  elements: CopyElement[],
): { present: CopyElement[]; missing: CopyElement[] } {
  const lower = html.toLowerCase();
  const present: CopyElement[] = [];
  const missing: CopyElement[] = [];
  for (const el of elements) {
    // Elements with no detectHints (e.g. sector-vocabulary) are treated as
    // undetectable — always flagged as potentially missing so the auditor checks manually.
    if (!el.detectHints.length) {
      missing.push(el);
      continue;
    }
    const found = el.detectHints.some((hint) => lower.includes(hint.toLowerCase()));
    (found ? present : missing).push(el);
  }
  return { present, missing };
}

/**
 * Builds the copy element present/missing checklist injected into the
 * copy quality audit prompt. Covers all priorities.
 */
export function buildCopyAuditBlock(campaignType: string, html: string): string {
  const elements = getCopyElementsForCampaign(campaignType);
  if (!elements.length) return "";

  const { present, missing } = detectPresentCopyElements(html, elements);

  const presentStr = present.length
    ? present.map((el) => `  ✓ ${el.name}`).join("\n")
    : "  (none detected)";

  const missingStr = missing.length
    ? missing.map((el) => `  ✗ ${el.name} [${el.priority}] — ${el.description}`).join("\n")
    : "  (all recommended elements detected)";

  return `## Copy element checklist for ${campaignType} campaigns
The following direct-response copywriting techniques are recommended for high-converting landing pages in this category.

DETECTED (likely present):
${presentStr}

NOT DETECTED (potentially missing):
${missingStr}

For each NOT DETECTED element: evaluate whether it would genuinely improve conversion copy on this specific page. If yes, raise it as a high or medium severity issue with a concrete rewrite instruction — provide the actual improved copy text where possible.`;
}
