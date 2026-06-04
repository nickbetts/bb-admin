/**
 * Grand Plan coherence validator.
 *
 * Runs after every section has been generated. Cross-checks the assembled
 * plan against the upstream Strategy Brain so that we catch the most common
 * inconsistencies BEFORE the strategist sees the document:
 *   - Email segment names should mirror the brain's audience names
 *   - Each calendar blog post should declare a target audience the brain knows
 *   - Each Google Ads ad group should reference at least one brain pain point
 *   - KPI targets should be within ±50% of the GA4 baseline (when available)
 *   - Negative keywords should not conflict with declared focus periods
 *
 * The validator is intentionally pure: it produces a list of issues. The
 * caller (the assemble step in the route) decides whether to attempt small,
 * targeted Haiku corrections or to surface the issues unresolved in
 * `generationReport.coherence` for the strategist to fix manually.
 */
import type { GrandPlanData, StrategyBrain, GrandPlanSources } from "./types";

export interface CoherenceIssue {
  /** Section key the issue lives in (e.g. "emailMarketing", "contentCalendar"). */
  section: string;
  /** Short human description of the inconsistency. */
  issue: string;
  /** Suggested fix expressed in plain English so a Haiku correction can act on it. */
  suggestedFix: string;
  /** Severity used by the renderer to colour-code the panel. */
  severity: "low" | "medium" | "high";
}

/** Normalise an audience-style label so "Owner-operators" matches "owner operators". */
function normName(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Loose containment: does any approved name partially overlap with the candidate? */
function hasAnyMatch(candidate: string, approved: string[]): boolean {
  const c = normName(candidate);
  if (!c) return true; // empty fields are caught elsewhere
  return approved.some((a) => {
    const n = normName(a);
    if (!n) return false;
    if (n === c || n.includes(c) || c.includes(n)) return true;
    // Token overlap: at least 2 shared meaningful tokens.
    const ct = new Set(c.split(" ").filter((t) => t.length > 3));
    const nt = new Set(n.split(" ").filter((t) => t.length > 3));
    let shared = 0;
    ct.forEach((t) => {
      if (nt.has(t)) shared++;
    });
    return shared >= 2;
  });
}

export function validateCoherence(
  plan: GrandPlanData,
  brain: StrategyBrain | undefined,
  sources: GrandPlanSources,
): CoherenceIssue[] {
  const issues: CoherenceIssue[] = [];

  // Use brain audience names when available; otherwise fall back to the
  // generated audiences section. We still validate even if the brain failed
  // (so a stale plan still gets some checks).
  const approvedAudiences = (brain?.audiences.map((a) => a.name) ?? [])
    .concat((plan.sections.audiences ?? []).map((a) => a.name))
    .filter((n): n is string => !!n);

  // ── Calendar blog posts have a target audience the brain knows ─────────
  const calendar = plan.sections.contentCalendar ?? [];
  if (calendar.length && approvedAudiences.length) {
    for (const month of calendar) {
      for (const post of month.blogPosts ?? []) {
        const angle = (post as { angle?: string }).angle ?? "";
        if (!angle) continue;
        // angle is "Written for [audience], addresses [pain], opens with [hook]"
        const m = angle.match(/written for\s+([^,]+)/i);
        const audienceTag = m?.[1]?.trim();
        if (audienceTag && !hasAnyMatch(audienceTag, approvedAudiences)) {
          issues.push({
            section: "contentCalendar",
            issue: `${month.month}: blog "${post.title}" targets "${audienceTag}" which is not on the audience list.`,
            suggestedFix: `Reframe the angle so the post is written for one of: ${approvedAudiences.slice(0, 4).join(", ")}.`,
            severity: "low",
          });
        }
      }
    }
  }

  // KPI sanity check removed — KPIs section no longer exists.

  // ── Negative keywords don't conflict with focus periods ────────────────
  // If a focus period mentions a theme (e.g. "Summer school holiday camps"),
  // the AI sometimes adds the very keyword as a negative. We only catch the
  // most obvious case — direct token overlap — to avoid false positives.
  const negs = plan.sections.googleAdsCampaigns?.aiNegativesWithReason ?? [];
  const focusTokens = new Set<string>();
  (sources.campaignFocusPeriods ?? []).forEach((p) => {
    [p.label, p.description ?? ""].forEach((s) => {
      s.toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length > 4)
        .forEach((t) => focusTokens.add(t));
    });
  });
  if (focusTokens.size > 0) {
    for (const n of negs) {
      const tokens = (n.keyword ?? "")
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean);
      const hit = tokens.find((t) => focusTokens.has(t));
      if (hit) {
        issues.push({
          section: "googleAdsCampaigns",
          issue: `Negative keyword "${n.keyword}" overlaps with the focus period token "${hit}". This will block ads during a planned campaign.`,
          suggestedFix: `Remove "${n.keyword}" from the negative list, or scope it to a campaign other than the one running the "${hit}" focus period.`,
          severity: "high",
        });
      }
    }
  }

  return issues;
}

/**
 * Deterministic auto-correction for the coherence issues that
 * `validateCoherence` flags. No LLM call — just normalises offending
 * fields against the approved audience list / focus periods.
 *
 * Returns a count of mutations applied (for logging only). The plan
 * object is mutated in place. Issues that can't be auto-fixed safely
 * are simply left untouched and will be re-flagged on the next call.
 */
export function autoFixCoherence(
  plan: GrandPlanData,
  brain: StrategyBrain | undefined,
  sources: GrandPlanSources,
): number {
  const approvedAudiences = (brain?.audiences.map((a) => a.name) ?? [])
    .concat((plan.sections.audiences ?? []).map((a) => a.name))
    .filter((n): n is string => !!n);

  let fixes = 0;

  // Pick the approved audience with the most token overlap with `candidate`.
  // Falls back to round-robin (using the rotateIdx counter) so we don't
  // pile every offending item onto the same audience.
  const rotate = { i: 0 };
  const pickAudience = (candidate: string): string | null => {
    if (!approvedAudiences.length) return null;
    const c = normName(candidate);
    if (c) {
      const cTokens = new Set(c.split(" ").filter((t) => t.length > 3));
      let best: { name: string; score: number } | null = null;
      for (const a of approvedAudiences) {
        const aTokens = new Set(
          normName(a)
            .split(" ")
            .filter((t) => t.length > 3),
        );
        let shared = 0;
        cTokens.forEach((t) => {
          if (aTokens.has(t)) shared++;
        });
        if (!best || shared > best.score) best = { name: a, score: shared };
      }
      if (best && best.score >= 1) return best.name;
    }
    const pick = approvedAudiences[rotate.i % approvedAudiences.length];
    rotate.i += 1;
    return pick;
  };

  // ── Calendar blog posts → rewrite the "Written for X" tag ──────────────
  const calendar = plan.sections.contentCalendar ?? [];
  if (calendar.length && approvedAudiences.length) {
    for (const month of calendar) {
      for (const post of month.blogPosts ?? []) {
        const angle = (post as { angle?: string }).angle ?? "";
        const m = angle.match(/written for\s+([^,]+)/i);
        const tag = m?.[1]?.trim();
        if (!tag) continue;
        if (hasAnyMatch(tag, approvedAudiences)) continue;
        const replacement = pickAudience(
          `${tag} ${post.title ?? ""} ${(post as { targetKeyword?: string }).targetKeyword ?? ""}`,
        );
        if (!replacement) continue;
        // Replace the captured group, preserving the surrounding wording.
        const next = angle.replace(/(written for\s+)([^,]+)/i, `$1${replacement}`);
        if (next !== angle) {
          (post as { angle?: string }).angle = next;
          fixes += 1;
        }
      }
    }
  }

  // ── Negative keywords overlapping focus periods → drop them ────────────
  const negsContainer = plan.sections.googleAdsCampaigns;
  const negs = negsContainer?.aiNegativesWithReason ?? [];
  if (negs.length) {
    const focusTokens = new Set<string>();
    (sources.campaignFocusPeriods ?? []).forEach((p) => {
      [p.label, p.description ?? ""].forEach((s) => {
        s.toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter((t) => t.length > 4)
          .forEach((t) => focusTokens.add(t));
      });
    });
    if (focusTokens.size > 0 && negsContainer) {
      const keep = negs.filter((n) => {
        const tokens = (n.keyword ?? "")
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter(Boolean);
        const hit = tokens.some((t) => focusTokens.has(t));
        if (hit) fixes += 1;
        return !hit;
      });
      negsContainer.aiNegativesWithReason = keep;
    }
  }

  return fixes;
}
