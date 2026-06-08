import { NextRequest, NextResponse } from "next/server";
import { jsonrepair } from "jsonrepair";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-logger";
import { getAnthropicClient, logAnthropicUsage } from "@/lib/anthropic-client";
import { renderGrandPlanHtml } from "@/lib/grand-plan-html-template";
import type { GrandPlanData } from "@/lib/grand-plan-generator";

export const dynamic = "force-dynamic";
export const maxDuration = 800;

type SectionKey = keyof GrandPlanData["sections"];

type SecondPassMode = "review" | "rewrite";

interface SectionQaResult {
  sectionKey: string;
  changed: boolean;
  confidence: number;
  scores: {
    briefAlignment: number;
    factualGrounding: number;
    consistency: number;
    strategicDepth: number;
    clientSpecificity: number;
    readability: number;
  };
  findings: string[];
  hardFailures: string[];
  unresolvedRisks: string[];
  error?: string;
}

const MAX_TARGET_SECTIONS = 14;
const LOW_SCORE_THRESHOLD = 4;
const MAX_INSTRUCTIONS_LENGTH = 2500;
const MAX_SECTION_CHARS = 32000;
const MAX_SECTION_PREVIEW_CHARS = 12000;

function avgScore(scores: SectionQaResult["scores"]): number {
  const values = Object.values(scores);
  if (!values.length) return 0;
  const total = values.reduce((sum, n) => sum + n, 0);
  return total / values.length;
}

function summariseFailures(results: SectionQaResult[]): string[] {
  const lines = new Set<string>();
  for (const result of results) {
    const label = humanLabel(result.sectionKey);
    if (result.hardFailures.length > 0) {
      for (const failure of result.hardFailures.slice(0, 2)) {
        lines.add(`${label}: ${failure}`);
      }
    }
    const average = avgScore(result.scores);
    if (average < LOW_SCORE_THRESHOLD) {
      lines.add(`${label}: second-pass quality score ${average.toFixed(1)}/5`);
    }
    if (result.unresolvedRisks.length > 0) {
      lines.add(`${label}: ${result.unresolvedRisks[0]}`);
    }
  }
  return Array.from(lines);
}

function humanLabel(key: string): string {
  const labels: Record<string, string> = {
    executiveSummary: "Executive Summary",
    audiences: "Audiences",
    googleAdsCampaigns: "Google Ads Campaigns",
    metaCampaigns: "Meta Campaigns",
    linkedInAds: "LinkedIn Ads",
    contentStrategy: "Content Strategy",
    contentCalendar: "Content Calendar",
    competitorIntel: "Competitor Intelligence",
    seoFoundations: "SEO Foundations",
    strategyIntelligence: "Strategy Intelligence",
  };
  return labels[key] ?? key;
}

function clampScore(n: unknown): number {
  const value = Number(n);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(5, value));
}

function sanitizeResult(input: unknown, sectionKey: string): SectionQaResult {
  const fallback: SectionQaResult = {
    sectionKey,
    changed: false,
    confidence: 50,
    scores: {
      briefAlignment: 0,
      factualGrounding: 0,
      consistency: 0,
      strategicDepth: 0,
      clientSpecificity: 0,
      readability: 0,
    },
    findings: [],
    hardFailures: [],
    unresolvedRisks: [],
    error: undefined,
  };

  if (!input || typeof input !== "object") return fallback;
  const raw = input as Record<string, unknown>;
  const rawScores =
    raw.scores && typeof raw.scores === "object" ? (raw.scores as Record<string, unknown>) : {};

  return {
    sectionKey,
    changed: Boolean(raw.changed),
    confidence: Math.max(0, Math.min(100, Number(raw.confidence) || 50)),
    scores: {
      briefAlignment: clampScore(rawScores.briefAlignment),
      factualGrounding: clampScore(rawScores.factualGrounding),
      consistency: clampScore(rawScores.consistency),
      strategicDepth: clampScore(rawScores.strategicDepth),
      clientSpecificity: clampScore(rawScores.clientSpecificity),
      readability: clampScore(rawScores.readability),
    },
    findings: Array.isArray(raw.findings)
      ? raw.findings.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      : [],
    hardFailures: Array.isArray(raw.hardFailures)
      ? raw.hardFailures.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      : [],
    unresolvedRisks: Array.isArray(raw.unresolvedRisks)
      ? raw.unresolvedRisks.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      : [],
    error: typeof raw.error === "string" ? raw.error : undefined,
  };
}

function sectionShapeCompatible(original: unknown, replacement: unknown): boolean {
  if (original == null || replacement == null) return original === replacement;
  if (Array.isArray(original)) return Array.isArray(replacement);
  if (typeof original === "string") return typeof replacement === "string";
  if (typeof original === "number") return typeof replacement === "number";
  if (typeof original === "boolean") return typeof replacement === "boolean";
  if (typeof original === "object")
    return typeof replacement === "object" && !Array.isArray(replacement);
  return typeof original === typeof replacement;
}

function compactForModel(value: unknown): string {
  const raw = JSON.stringify(value);
  if (raw.length <= MAX_SECTION_CHARS) return raw;
  return `${raw.slice(0, MAX_SECTION_PREVIEW_CHARS)}\n...[truncated for safety]`;
}

function isTransientAnthropicError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const candidate = err as { status?: number; message?: string };
  if (candidate.status && [408, 425, 429, 500, 502, 503, 504, 529].includes(candidate.status)) {
    return true;
  }
  const msg = (candidate.message ?? "").toLowerCase();
  return (
    msg.includes("rate limit") ||
    msg.includes("timeout") ||
    msg.includes("overloaded") ||
    msg.includes("econnreset")
  );
}

function parseLooseJson<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(jsonrepair(cleaned)) as T;
}

async function critiqueAndMaybeRewrite(args: {
  anthropic: Awaited<ReturnType<typeof getAnthropicClient>>;
  mode: SecondPassMode;
  sectionKey: string;
  sectionValue: unknown;
  briefContext: string;
  planContext: string;
}): Promise<{ qa: SectionQaResult; improvedSection?: unknown }> {
  const { anthropic, mode, sectionKey, sectionValue, briefContext, planContext } = args;
  const sectionJson = compactForModel(sectionValue);

  const prompt = `You are a principal marketing strategy reviewer doing a second-pass QA on one section of a grand plan.

Evaluate this section against the client brief and overall plan context.

Scoring rubric (0-5 each):
- briefAlignment
- factualGrounding
- consistency
- strategicDepth
- clientSpecificity
- readability

Hard-fail examples:
- contradicts budget/targets from brief
- generic filler that ignores client context
- invented figures/claims not present in provided context
- contradicts campaign period or audience intent

Return strict JSON with this shape:
{
  "scores": {
    "briefAlignment": number,
    "factualGrounding": number,
    "consistency": number,
    "strategicDepth": number,
    "clientSpecificity": number,
    "readability": number
  },
  "findings": string[],
  "hardFailures": string[],
  "unresolvedRisks": string[],
  "confidence": number,
  "changed": boolean,
  "improvedSection": any
}

Rules:
- If mode is "review", set changed=false and improvedSection to the original section.
- If mode is "rewrite", rewrite the section when any score < 4 OR hardFailures is non-empty.
- Keep the exact data shape expected for section key "${sectionKey}".
- Never invent metrics not in provided context.
- Return only JSON.

Mode: ${mode}
Section key: ${sectionKey}

Client brief and constraints:
${briefContext}

Cross-section context:
${planContext}

Section input JSON:
${sectionJson}`;

  let response: Awaited<ReturnType<typeof anthropic.messages.create>> | null = null;
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 3500,
        temperature: 0.3,
        messages: [{ role: "user", content: prompt }],
      });
      break;
    } catch (error) {
      lastError = error;
      if (attempt === 1 || !isTransientAnthropicError(error)) {
        throw error;
      }
    }
  }

  if (!response) {
    throw new Error(lastError instanceof Error ? lastError.message : "Second-pass call failed");
  }

  await logAnthropicUsage("grand_plan_second_pass", response);

  const textBlock = response.content.find((block) => block.type === "text");
  const text = textBlock && textBlock.type === "text" ? textBlock.text : "{}";
  const parsed = parseLooseJson<Record<string, unknown>>(text);
  const qa = sanitizeResult(parsed, sectionKey);
  const improvedSection = parsed.improvedSection;

  if (!qa.changed || mode === "review") {
    return { qa };
  }

  return { qa, improvedSection };
}

// POST /api/tools/grand-plan/[id]/second-pass — critique and refine sections against brief/context
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const plan = await prisma.grandPlan.findUnique({
    where: { id },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          website: true,
          aiReportInstructions: true,
        },
      },
      proposal: { select: { title: true, clientName: true } },
      keywordResearch: {
        select: {
          title: true,
          website: true,
          monthlyBudget: true,
          brief: true,
        },
      },
      versions: { orderBy: { versionNumber: "desc" }, take: 1 },
    },
  });

  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (
    plan.userId !== session.user.id &&
    !session.user.permissions.includes("grand_plan.edit_any")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!plan.planDataJson) {
    return NextResponse.json({ error: "Plan has not been generated yet" }, { status: 400 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      mode?: SecondPassMode;
      sections?: string[];
      instructions?: string;
    };

    if (body.instructions && body.instructions.length > MAX_INSTRUCTIONS_LENGTH) {
      return NextResponse.json(
        {
          error: `instructions is too long (max ${MAX_INSTRUCTIONS_LENGTH} characters)`,
        },
        { status: 400 },
      );
    }

    const mode: SecondPassMode = body.mode === "review" ? "review" : "rewrite";
    const planData = JSON.parse(plan.planDataJson) as GrandPlanData;

    const availableSections = Object.entries(planData.sections)
      .filter(([, value]) => value != null)
      .map(([key]) => key as SectionKey);

    const requestedSections =
      body.sections && body.sections.length > 0
        ? Array.from(new Set(body.sections)).filter((key): key is SectionKey =>
            availableSections.includes(key as SectionKey),
          )
        : availableSections;

    const sectionKeys = requestedSections.slice(0, MAX_TARGET_SECTIONS);
    if (!sectionKeys.length) {
      return NextResponse.json(
        { error: "No eligible sections were found for second pass" },
        { status: 400 },
      );
    }

    const anthropic = await getAnthropicClient();

    const briefContext = [
      `Client: ${plan.client?.name ?? plan.prospectName ?? plan.proposal?.clientName ?? planData.clientName}`,
      `Purpose: ${plan.purpose}`,
      `Client brief: ${plan.clientBrief ?? ""}`,
      `Target audiences: ${plan.targetAudiences ?? ""}`,
      `Campaign period: ${plan.period ?? ""}`,
      `Proposal title: ${plan.proposal?.title ?? ""}`,
      `Keyword brief: ${plan.keywordResearch?.brief ?? ""}`,
      `Keyword budget: ${plan.keywordResearch?.monthlyBudget ?? ""}`,
      `Client AI instructions: ${plan.client?.aiReportInstructions ?? ""}`,
      body.instructions ? `Second-pass instruction override: ${body.instructions}` : "",
    ]
      .filter((line) => line.trim().length > 0)
      .join("\n");

    const planContext = JSON.stringify(
      {
        strategyBrain: planData.strategyBrain,
        campaignPeriods: planData.campaignPeriods,
        sectionVisibility: planData.sectionVisibility,
      },
      null,
      2,
    );

    const qaResults: SectionQaResult[] = [];
    let changedCount = 0;

    for (const sectionKey of sectionKeys) {
      const sectionValue = planData.sections[sectionKey];
      if (sectionValue == null) continue;

      try {
        const { qa, improvedSection } = await critiqueAndMaybeRewrite({
          anthropic,
          mode,
          sectionKey,
          sectionValue,
          briefContext,
          planContext,
        });

        if (mode === "rewrite" && qa.changed && improvedSection !== undefined) {
          if (!sectionShapeCompatible(sectionValue, improvedSection)) {
            qa.hardFailures = [
              ...qa.hardFailures,
              "Model rewrite changed the section data shape and was ignored for safety.",
            ];
            qa.changed = false;
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (planData.sections as any)[sectionKey] = improvedSection;
            changedCount += 1;
          }
        }

        qaResults.push(qa);
      } catch (error) {
        qaResults.push({
          sectionKey,
          changed: false,
          confidence: 0,
          scores: {
            briefAlignment: 0,
            factualGrounding: 0,
            consistency: 0,
            strategicDepth: 0,
            clientSpecificity: 0,
            readability: 0,
          },
          findings: [],
          hardFailures: ["Second-pass model call failed for this section."],
          unresolvedRisks: [
            "Section could not be validated automatically. Review manually before sharing.",
          ],
          error: error instanceof Error ? error.message : "Unknown section-level error",
        });
      }
    }

    const qaWarnings = summariseFailures(qaResults);

    const existingWarnings = Array.isArray(
      (planData as unknown as { pipelineWarnings?: unknown }).pipelineWarnings,
    )
      ? (
          ((planData as unknown as { pipelineWarnings?: unknown[] }).pipelineWarnings ??
            []) as unknown[]
        ).filter((line): line is string => typeof line === "string" && line.trim().length > 0)
      : [];

    const dedupWarnings = Array.from(new Set([...existingWarnings, ...qaWarnings]));

    // Keep QA metadata in planData so the editor can surface it without schema migrations.
    const nextPlanData = {
      ...planData,
      pipelineWarnings: dedupWarnings,
      secondPassQa: {
        generatedAt: new Date().toISOString(),
        mode,
        model: "claude-sonnet-4-6",
        changedSections: changedCount,
        reviewedSections: qaResults.length,
        results: qaResults,
      },
    } as unknown as GrandPlanData;

    const html = renderGrandPlanHtml(nextPlanData);

    const latestVersion = plan.versions[0];
    const nextVersion = (latestVersion?.versionNumber ?? 0) + 1;

    const hardFailureCount = qaResults.reduce((sum, result) => sum + result.hardFailures.length, 0);

    const qualityState = {
      version: 1,
      checkedAt: new Date().toISOString(),
      planId: id,
      title: plan.title,
      strictMode: true,
      status: hardFailureCount > 0 ? "failed" : qaWarnings.length > 0 ? "warning" : "ok",
      summary:
        hardFailureCount > 0
          ? `Second pass found ${hardFailureCount} hard failure${hardFailureCount === 1 ? "" : "s"}.`
          : qaWarnings.length > 0
            ? `Second pass found ${qaWarnings.length} issue${qaWarnings.length === 1 ? "" : "s"}.`
            : "Second pass completed with no critical issues.",
      secondPass: {
        mode,
        changedSections: changedCount,
        reviewedSections: qaResults.length,
        hardFailureCount,
      },
    };

    const [version] = await prisma.$transaction([
      prisma.grandPlanVersion.create({
        data: {
          grandPlanId: id,
          versionNumber: nextVersion,
          generatedHtml: html,
          planDataJson: JSON.stringify(nextPlanData),
          qualityStateJson: JSON.stringify(qualityState),
          prompt: `Second-pass ${mode} (${qaResults.length} sections)`,
        },
      }),
      prisma.grandPlan.update({
        where: { id },
        data: {
          generatedHtml: html,
          planDataJson: JSON.stringify(nextPlanData),
          qualityStateJson: JSON.stringify(qualityState),
        },
      }),
    ]);

    logActivity({
      userId: session.user.id,
      userEmail: session.user.email,
      action: "grand_plan_refined",
      resourceType: "GrandPlan",
      resourceId: id,
      description: `Ran second-pass ${mode} on ${qaResults.length} section(s) (changed ${changedCount}).`,
    });

    return NextResponse.json({
      version: {
        id: version.id,
        versionNumber: version.versionNumber,
        createdAt: version.createdAt,
      },
      mode,
      reviewedSections: qaResults.length,
      changedSections: changedCount,
      hardFailureCount,
      warnings: qaWarnings,
      qa: qaResults,
      html,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Grand plan second-pass error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
