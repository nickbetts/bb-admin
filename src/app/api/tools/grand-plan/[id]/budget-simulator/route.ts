import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { GrandPlanData } from "@/lib/grand-plan-generator";

const SCENARIO_FACTORS: Record<string, number> = {
  conservative: 0.85,
  base: 1,
  aggressive: 1.2,
};

function parseBudget(value: unknown, fallback = 0): number {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) && num > 0 ? num : fallback;
}

function clampPercentage(value: unknown, fallback = 15): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(-60, Math.min(300, num));
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const plan = await prisma.grandPlan.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      prospectName: true,
      title: true,
      planDataJson: true,
      keywordResearch: { select: { monthlyBudget: true } },
      mediaPlan: { select: { totalBudget: true } },
      client: { select: { name: true } },
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
    const body = (await request.json()) as {
      scenario?: "conservative" | "base" | "aggressive";
      budgetPercentage?: number;
    };
    const scenario = body.scenario && SCENARIO_FACTORS[body.scenario] ? body.scenario : "base";
    const budgetPercentage = clampPercentage(body.budgetPercentage, 15);

    const planData = JSON.parse(plan.planDataJson) as GrandPlanData;
    const strategy = planData.sections.strategyIntelligence;

    const baseBudget =
      parseBudget(plan.keywordResearch?.monthlyBudget, 0) ||
      parseBudget(plan.mediaPlan?.totalBudget, 0) ||
      (strategy?.ppcIntelligence?.elasticityCurve?.[1]?.budget ?? 0);

    if (!baseBudget) {
      return NextResponse.json(
        { error: "No budget baseline is available for simulation" },
        { status: 400 },
      );
    }

    const basePoint = strategy?.ppcIntelligence?.elasticityCurve?.find(
      (point) => point.budget === baseBudget,
    ) ??
      strategy?.ppcIntelligence?.elasticityCurve?.[1] ?? { budget: baseBudget, conversions: 0 };
    const baselineConversions = Math.max(0, basePoint.conversions || 0);
    const factor = SCENARIO_FACTORS[scenario];
    const adjustedBudget = Math.max(0, baseBudget * factor * (1 + budgetPercentage / 100 - 0.15));
    const budgetDelta = adjustedBudget - baseBudget;
    const conversionDelta = baselineConversions * (adjustedBudget / baseBudget - 1) * 0.78;
    const estimatedConversions = Math.max(0, baselineConversions + conversionDelta);
    const estimatedCpa =
      estimatedConversions > 0 ? adjustedBudget / estimatedConversions : adjustedBudget;
    const estimatedRoas =
      estimatedCpa > 0
        ? (strategy?.strategySimulation?.breakeven?.conversionValue ?? 1) / estimatedCpa
        : 0;
    const estimatedClicks = strategy?.ppcIntelligence?.elasticityCurve?.[1]
      ? Math.round(
          (adjustedBudget / Math.max(strategy.ppcIntelligence.elasticityCurve[1].budget, 1)) *
            Math.max(baselineConversions * 8, 1),
        )
      : Math.round(adjustedBudget / 2);

    return NextResponse.json({
      id: plan.id,
      title: plan.title,
      clientName: plan.client?.name ?? plan.prospectName ?? null,
      scenario,
      budgetPercentage,
      baseBudget,
      adjustedBudget: Number(adjustedBudget.toFixed(2)),
      budgetDelta: Number(budgetDelta.toFixed(2)),
      estimatedConversions: Number(estimatedConversions.toFixed(1)),
      estimatedCpa: Number(estimatedCpa.toFixed(2)),
      estimatedRoas: Number(estimatedRoas.toFixed(2)),
      estimatedClicks,
      assumptions: {
        baselineConversions,
        factor,
        source: strategy?.dataTrust.status ?? "ai-only",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("grand-plan budget simulator error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
