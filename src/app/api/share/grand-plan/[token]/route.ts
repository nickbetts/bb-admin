import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { renderGrandPlanHtml } from "@/lib/grand-plan-html-template";
import type { GrandPlanData } from "@/lib/grand-plan-generator";
import { renderPresentationHtml } from "@/lib/grand-plan-presentation-template";
import type { PresentationData } from "@/lib/grand-plan-presentation-generator";
import { checkPresentationFreshness } from "@/lib/grand-plan-presentation-freshness";

const SHARE_PASSWORD_VERSION = "s2";

function timingSafeHexEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function hashLegacySha256(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function hashSharePasswordV2(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${SHARE_PASSWORD_VERSION}:${salt}:${hash}`;
}

function verifySharePassword(
  password: string,
  stored: string,
): { valid: boolean; needsUpgrade: boolean } {
  const parts = stored.split(":");
  if (parts.length === 3 && parts[0] === SHARE_PASSWORD_VERSION) {
    const [, salt, expectedHash] = parts;
    if (!salt || !expectedHash) return { valid: false, needsUpgrade: false };
    const actualHash = crypto.scryptSync(password, salt, 64).toString("hex");
    return { valid: timingSafeHexEqual(actualHash, expectedHash), needsUpgrade: false };
  }

  const legacyHash = hashLegacySha256(password);
  const valid = timingSafeHexEqual(legacyHash, stored);
  return { valid, needsUpgrade: valid };
}

type SharePlanFields = {
  planDataJson: string | null;
  generatedHtml: string | null;
  presentationDataJson: string | null;
  presentationHtml: string | null;
};

const STRIP_CLASS_TOKENS = new Set(["gp-edit", "editable-inline", "gp-saving", "gp-saved"]);

function stripPublicEditUi(html: string): string {
  if (!html) return "";

  // Keep embedded runtime JS untouched; only sanitise rendered markup.
  const scriptStart = html.search(/<script[\s>]/i);
  const markup = scriptStart === -1 ? html : html.slice(0, scriptStart);
  const script = scriptStart === -1 ? "" : html.slice(scriptStart);

  let cleaned = markup;

  // Internal-only floating undo toolbar.
  cleaned = cleaned.replace(/<div[^>]*id="gp-edit-toolbar"[\s\S]*?<\/div>/gi, "");

  // Generic delete buttons and section-specific delete affordances.
  cleaned = cleaned.replace(/<button[^>]*data-delete-path="[^"]*"[^>]*>[\s\S]*?<\/button>/gi, "");
  cleaned = cleaned.replace(
    /<button[^>]*class="[^"]*(?:subsection-delete-btn|kw-remove-btn|ag-delete-btn|seed-delete-btn|kw-save-btn)[^"]*"[^>]*>[\s\S]*?<\/button>/gi,
    "",
  );

  // Inline "add" rows used by the editor.
  cleaned = cleaned.replace(/<div[^>]*class="[^"]*kw-add-row[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "");

  // Remove edit-specific attributes so public viewers cannot edit text.
  cleaned = cleaned
    .replace(/\scontenteditable="true"/gi, "")
    .replace(/\sspellcheck="false"/gi, "")
    .replace(/\sdata-edit-path="[^"]*"/gi, "")
    .replace(/\sdata-delete-path="[^"]*"/gi, "")
    .replace(/\sdata-delete-label="[^"]*"/gi, "");

  // Drop edit styling classes while preserving all other classes.
  cleaned = cleaned.replace(/class="([^"]*)"/gi, (_match, className: string) => {
    const tokens = className
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean)
      .filter((token) => !STRIP_CLASS_TOKENS.has(token));
    return tokens.length ? `class="${tokens.join(" ")}"` : "";
  });

  return cleaned + script;
}

function buildPublicHtml(plan: SharePlanFields, view: "plan" | "presentation"): string {
  if (view === "presentation") {
    if (plan.presentationDataJson) {
      try {
        return stripPublicEditUi(
          renderPresentationHtml(JSON.parse(plan.presentationDataJson) as PresentationData, true),
        );
      } catch {
        // fall through to stored HTML on parse error
      }
    }
    return stripPublicEditUi(plan.presentationHtml ?? "");
  }
  if (plan.planDataJson) {
    try {
      return stripPublicEditUi(
        renderGrandPlanHtml(JSON.parse(plan.planDataJson) as GrandPlanData, true),
      );
    } catch {
      // fall through to stored HTML on parse error
    }
  }
  return stripPublicEditUi(plan.generatedHtml ?? "");
}

function parseView(req: NextRequest): "plan" | "presentation" {
  const v = req.nextUrl.searchParams.get("view");
  return v === "presentation" ? "presentation" : "plan";
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token || token.length < 10) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }
  const view = parseView(req);

  const plan = await prisma.grandPlan.findUnique({
    where: { shareToken: token },
    select: {
      id: true,
      title: true,
      sharePassword: true,
      shareExpiresAt: true,
      generatedHtml: true,
      planDataJson: true,
      presentationHtml: true,
      presentationDataJson: true,
      enquiryFormEnabled: true,
      prospectName: true,
      client: { select: { name: true } },
    },
  });

  if (!plan) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (plan.shareExpiresAt && new Date(plan.shareExpiresAt) < new Date()) {
    return NextResponse.json({ error: "This share link has expired" }, { status: 410 });
  }

  if (view === "presentation") {
    const freshness = checkPresentationFreshness({
      planDataJson: plan.planDataJson,
      presentationDataJson: plan.presentationDataJson,
    });
    if (!freshness.fresh) {
      return NextResponse.json(
        {
          error:
            "This presentation is being updated and is not available yet. Please ask your strategist to regenerate it.",
        },
        { status: 409 },
      );
    }
  }

  const displayName = plan.client?.name ?? plan.prospectName ?? null;

  if (plan.sharePassword) {
    return NextResponse.json({
      id: plan.id,
      title: plan.title,
      clientName: displayName,
      passwordRequired: true,
      enquiryFormEnabled: plan.enquiryFormEnabled,
      hasPresentation: !!(plan.presentationHtml || plan.presentationDataJson),
    });
  }

  await prisma.grandPlan.update({
    where: { id: plan.id },
    data: {
      viewCount: { increment: 1 },
      lastViewedAt: new Date(),
    },
  });

  return NextResponse.json({
    id: plan.id,
    title: plan.title,
    clientName: displayName,
    passwordRequired: false,
    enquiryFormEnabled: plan.enquiryFormEnabled,
    hasPresentation: !!(plan.presentationHtml || plan.presentationDataJson),
    view,
    html: buildPublicHtml(plan, view),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token || token.length < 10) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }
  const view = parseView(request);

  const plan = await prisma.grandPlan.findUnique({
    where: { shareToken: token },
    select: {
      id: true,
      title: true,
      sharePassword: true,
      shareExpiresAt: true,
      generatedHtml: true,
      planDataJson: true,
      presentationHtml: true,
      presentationDataJson: true,
      enquiryFormEnabled: true,
      prospectName: true,
      client: { select: { name: true } },
    },
  });

  if (!plan) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (plan.shareExpiresAt && new Date(plan.shareExpiresAt) < new Date()) {
    return NextResponse.json({ error: "This share link has expired" }, { status: 410 });
  }

  if (view === "presentation") {
    const freshness = checkPresentationFreshness({
      planDataJson: plan.planDataJson,
      presentationDataJson: plan.presentationDataJson,
    });
    if (!freshness.fresh) {
      return NextResponse.json(
        {
          error:
            "This presentation is being updated and is not available yet. Please ask your strategist to regenerate it.",
        },
        { status: 409 },
      );
    }
  }

  const displayName = plan.client?.name ?? plan.prospectName ?? null;

  if (!plan.sharePassword) {
    return NextResponse.json({
      id: plan.id,
      title: plan.title,
      clientName: displayName,
      enquiryFormEnabled: plan.enquiryFormEnabled,
      hasPresentation: !!(plan.presentationHtml || plan.presentationDataJson),
      view,
      html: buildPublicHtml(plan, view),
    });
  }

  const payload = (await request.json().catch(() => ({}))) as { password?: string };
  const password = payload.password;
  if (typeof password !== "string" || !password) {
    return NextResponse.json({ error: "Password required" }, { status: 401 });
  }

  const verification = verifySharePassword(password, plan.sharePassword);
  if (!verification.valid) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  if (verification.needsUpgrade) {
    await prisma.grandPlan.update({
      where: { id: plan.id },
      data: { sharePassword: hashSharePasswordV2(password) },
    });
  }

  await prisma.grandPlan.update({
    where: { id: plan.id },
    data: {
      viewCount: { increment: 1 },
      lastViewedAt: new Date(),
    },
  });

  return NextResponse.json({
    id: plan.id,
    title: plan.title,
    clientName: displayName,
    enquiryFormEnabled: plan.enquiryFormEnabled,
    hasPresentation: !!(plan.presentationHtml || plan.presentationDataJson),
    view,
    html: buildPublicHtml(plan, view),
  });
}
