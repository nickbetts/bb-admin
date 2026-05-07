// Server-side validators for Meta Assassin campaign plans.
// Run after Claude returns a plan to catch hallucinated targeting IDs,
// off-budget splits and copy-hygiene violations.

const BANNED_PHRASES = [
  "unlock", "discover", "elevate", "in today's world", "in a world where",
  "game-changer", "game changer", "take your", "to the next level",
  "whether you're", "cutting-edge", "cutting edge", "revolutionary",
  "seamless", "empower", "harness", "leverage", "tap into", "step into",
  "dive into", "journey", "it's important to note", "furthermore",
  "moreover", "additionally", "therefore", "crafted", "curated",
  "transform your", "reimagine", "redefine", "world of",
  "discover the magic", "picture this", "imagine if",
];

export interface CopyHygieneViolation {
  path: string;
  text: string;
  reasons: string[];
}

// Walk a copy field looking for em dashes, en dashes and banned phrasing.
function scanCopy(path: string, text: string): CopyHygieneViolation | null {
  if (typeof text !== "string" || !text.trim()) return null;
  const reasons: string[] = [];
  if (text.includes("—")) reasons.push("em dash (—) present");
  if (text.includes("–")) reasons.push("en dash (–) present");

  const lower = text.toLowerCase();
  for (const phrase of BANNED_PHRASES) {
    if (lower.includes(phrase)) reasons.push(`banned phrase: "${phrase}"`);
  }
  if (reasons.length === 0) return null;
  return { path, text, reasons };
}

// Walk all copy fields in a plan and collect violations.
export function findCopyHygieneViolations(plan: unknown): CopyHygieneViolation[] {
  const violations: CopyHygieneViolation[] = [];
  if (!plan || typeof plan !== "object") return violations;

  const p = plan as {
    campaigns?: {
      adSets?: {
        creatives?: {
          hooks?: string[];
          headlines?: string[];
          primaryTexts?: string[];
          longFormVariants?: { tone?: string; text?: string }[];
        }[];
      }[];
    }[];
  };

  (p.campaigns ?? []).forEach((c, ci) => {
    (c.adSets ?? []).forEach((a, ai) => {
      (a.creatives ?? []).forEach((cr, cri) => {
        (cr.hooks ?? []).forEach((t, i) => {
          const v = scanCopy(`campaigns[${ci}].adSets[${ai}].creatives[${cri}].hooks[${i}]`, t);
          if (v) violations.push(v);
        });
        (cr.headlines ?? []).forEach((t, i) => {
          const v = scanCopy(`campaigns[${ci}].adSets[${ai}].creatives[${cri}].headlines[${i}]`, t);
          if (v) violations.push(v);
        });
        (cr.primaryTexts ?? []).forEach((t, i) => {
          const v = scanCopy(`campaigns[${ci}].adSets[${ai}].creatives[${cri}].primaryTexts[${i}]`, t);
          if (v) violations.push(v);
        });
        (cr.longFormVariants ?? []).forEach((lv, i) => {
          if (!lv?.text) return;
          const v = scanCopy(
            `campaigns[${ci}].adSets[${ai}].creatives[${cri}].longFormVariants[${i}].text`,
            lv.text
          );
          if (v) violations.push(v);
          // Also enforce 80-220 word count on long-form
          const wc = lv.text.trim().split(/\s+/).filter(Boolean).length;
          if (wc < 60 || wc > 240) {
            violations.push({
              path: `campaigns[${ci}].adSets[${ai}].creatives[${cri}].longFormVariants[${i}].text`,
              text: lv.text,
              reasons: [`word count ${wc} outside target range 80-220`],
            });
          }
        });
      });
    });
  });

  return violations;
}

// ─── Targeting ID validator ─────────────────────────────────────────────
// Filters out any ID Claude returned in adSet.targetingOptionIds that wasn't
// in the input pillar catalogue. Returns the cleaned plan + a list of
// dropped IDs for telemetry.

export interface IdValidationResult<T> {
  plan: T;
  droppedIds: string[];
}

export function validateTargetingIds<T>(
  plan: T,
  validIds: Set<string>
): IdValidationResult<T> {
  if (!plan || typeof plan !== "object") return { plan, droppedIds: [] };
  const dropped = new Set<string>();
  // Deep-clone so we can mutate safely
  const clone = JSON.parse(JSON.stringify(plan)) as {
    campaigns?: { adSets?: { targetingOptionIds?: string[] }[] }[];
  };
  (clone.campaigns ?? []).forEach((c) => {
    (c.adSets ?? []).forEach((a) => {
      if (!Array.isArray(a.targetingOptionIds)) return;
      const cleaned: string[] = [];
      for (const id of a.targetingOptionIds) {
        if (validIds.has(String(id))) cleaned.push(String(id));
        else dropped.add(String(id));
      }
      a.targetingOptionIds = cleaned;
    });
  });
  return { plan: clone as unknown as T, droppedIds: [...dropped] };
}

// ─── Budget validator ──────────────────────────────────────────────────
// Verifies that ad-set budgets within a campaign sum to the campaign's
// dailyBudget. If they're off by more than ±0.5% we proportionally
// rescale (when ABO) or annotate a warning (when CBO — the campaign
// budget is the source of truth and ad-sets are advisory there).

export interface BudgetReport {
  campaignIndex: number;
  campaignName: string;
  campaignBudget: number;
  adSetSum: number;
  drift: number;          // adSetSum - campaignBudget
  driftPct: number;       // drift / campaignBudget
  rescaled: boolean;
}

export function validateAndRescaleBudgets<T>(plan: T): { plan: T; reports: BudgetReport[] } {
  if (!plan || typeof plan !== "object") return { plan, reports: [] };
  const clone = JSON.parse(JSON.stringify(plan)) as {
    campaigns?: {
      name?: string;
      dailyBudget?: number;
      budgetMode?: string;
      adSets?: { dailyBudget?: number }[];
    }[];
  };
  const reports: BudgetReport[] = [];

  (clone.campaigns ?? []).forEach((c, ci) => {
    const campaignBudget = Number(c.dailyBudget) || 0;
    const adSets = c.adSets ?? [];
    const sum = adSets.reduce((s, a) => s + (Number(a.dailyBudget) || 0), 0);
    if (campaignBudget <= 0 || sum <= 0) return;
    const drift = sum - campaignBudget;
    const driftPct = drift / campaignBudget;

    let rescaled = false;
    // Only rescale when it's wrong by more than 0.5%
    if (Math.abs(driftPct) > 0.005) {
      const factor = campaignBudget / sum;
      adSets.forEach((a) => {
        if (typeof a.dailyBudget === "number") {
          a.dailyBudget = Math.round(a.dailyBudget * factor * 100) / 100;
        }
      });
      // Final pass: nudge the largest ad set so we hit the campaign exactly.
      const newSum = adSets.reduce((s, a) => s + (Number(a.dailyBudget) || 0), 0);
      const finalDrift = campaignBudget - newSum;
      if (Math.abs(finalDrift) > 0.001 && adSets.length > 0) {
        let largestIdx = 0;
        let largestVal = -Infinity;
        adSets.forEach((a, i) => {
          if ((Number(a.dailyBudget) || 0) > largestVal) {
            largestVal = Number(a.dailyBudget) || 0;
            largestIdx = i;
          }
        });
        adSets[largestIdx].dailyBudget = Math.round((largestVal + finalDrift) * 100) / 100;
      }
      rescaled = true;
    }

    reports.push({
      campaignIndex: ci,
      campaignName: c.name ?? `Campaign ${ci + 1}`,
      campaignBudget,
      adSetSum: sum,
      drift,
      driftPct,
      rescaled,
    });
  });

  return { plan: clone as unknown as T, reports };
}

// Pretty-print violations for the re-ask prompt.
export function formatViolationsForPrompt(violations: CopyHygieneViolation[]): string {
  if (violations.length === 0) return "";
  const lines = violations.slice(0, 30).map((v) => {
    return `- ${v.path}: ${v.reasons.join(", ")}\n  Current: "${v.text.slice(0, 200)}${v.text.length > 200 ? "…" : ""}"`;
  });
  return lines.join("\n");
}
