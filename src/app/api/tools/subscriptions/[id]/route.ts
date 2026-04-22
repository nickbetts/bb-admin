import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/secret-crypto";

export const dynamic = "force-dynamic";

interface SubscriptionPatch {
  platform?: string;
  category?: string | null;
  url?: string | null;
  email?: string | null;
  loginMethod?: string;
  password?: string | null;   // when present (even ""), updates ciphertext
  cost?: number;
  currency?: string;
  billingCycle?: "monthly" | "yearly";
  renewalDate?: string | null;
  owner?: string | null;
  notes?: string | null;
  active?: boolean;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const reveal = searchParams.get("reveal") === "1";

    const sub = await prisma.agencySubscription.findUnique({ where: { id } });
    if (!sub) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });

    return NextResponse.json({
      id: sub.id,
      platform: sub.platform,
      category: sub.category,
      url: sub.url,
      email: sub.email,
      loginMethod: sub.loginMethod,
      password: reveal ? decryptSecret(sub.passwordEnc) : "",
      hasPassword: Boolean(sub.passwordEnc),
      cost: sub.cost,
      currency: sub.currency,
      billingCycle: sub.billingCycle,
      renewalDate: sub.renewalDate,
      owner: sub.owner,
      notes: sub.notes,
      active: sub.active,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Get subscription error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const data = (await request.json()) as SubscriptionPatch;

    const existing = await prisma.agencySubscription.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });

    const updated = await prisma.agencySubscription.update({
      where: { id },
      data: {
        ...(data.platform !== undefined && { platform: data.platform.trim() }),
        ...(data.category !== undefined && { category: data.category?.trim() || null }),
        ...(data.url !== undefined && { url: data.url?.trim() || null }),
        ...(data.email !== undefined && { email: data.email?.trim() || null }),
        ...(data.loginMethod !== undefined && { loginMethod: data.loginMethod }),
        ...(data.password !== undefined && {
          passwordEnc: data.password ? encryptSecret(data.password) : null,
        }),
        ...(data.cost !== undefined && Number.isFinite(data.cost) && { cost: data.cost }),
        ...(data.currency !== undefined && { currency: data.currency.trim() || "GBP" }),
        ...(data.billingCycle !== undefined && {
          billingCycle: data.billingCycle === "yearly" ? "yearly" : "monthly",
        }),
        ...(data.renewalDate !== undefined && { renewalDate: data.renewalDate?.trim() || null }),
        ...(data.owner !== undefined && { owner: data.owner?.trim() || null }),
        ...(data.notes !== undefined && { notes: data.notes?.trim() || null }),
        ...(data.active !== undefined && { active: data.active }),
      },
    });

    return NextResponse.json({
      id: updated.id,
      platform: updated.platform,
      category: updated.category,
      url: updated.url,
      email: updated.email,
      loginMethod: updated.loginMethod,
      hasPassword: Boolean(updated.passwordEnc),
      cost: updated.cost,
      currency: updated.currency,
      billingCycle: updated.billingCycle,
      renewalDate: updated.renewalDate,
      owner: updated.owner,
      notes: updated.notes,
      active: updated.active,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Update subscription error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const existing = await prisma.agencySubscription.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });

    await prisma.agencySubscription.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Delete subscription error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
