import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/secret-crypto";

export const dynamic = "force-dynamic";

interface SubscriptionInput {
  platform?: string;
  category?: string | null;
  url?: string | null;
  email?: string | null;
  password?: string | null;   // plaintext from client; encrypted before save
  cost?: number;
  currency?: string;
  billingCycle?: "monthly" | "yearly";
  renewalDate?: string | null;
  owner?: string | null;
  notes?: string | null;
  active?: boolean;
}

function serialise(sub: {
  id: string; platform: string; category: string | null; url: string | null;
  email: string | null; passwordEnc: string | null; cost: number; currency: string;
  billingCycle: string; renewalDate: string | null; owner: string | null;
  notes: string | null; active: boolean; createdAt: Date; updatedAt: Date;
}, revealPassword: boolean) {
  return {
    id: sub.id,
    platform: sub.platform,
    category: sub.category,
    url: sub.url,
    email: sub.email,
    password: revealPassword ? decryptSecret(sub.passwordEnc) : "",
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
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const reveal = searchParams.get("reveal") === "1";

    const subs = await prisma.agencySubscription.findMany({
      orderBy: [{ active: "desc" }, { platform: "asc" }],
    });

    return NextResponse.json(subs.map(s => serialise(s, reveal)));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("List subscriptions error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = (await request.json()) as SubscriptionInput;

    if (!data.platform || !data.platform.trim()) {
      return NextResponse.json({ error: "platform is required" }, { status: 400 });
    }

    const sub = await prisma.agencySubscription.create({
      data: {
        platform: data.platform.trim(),
        category: data.category?.trim() || null,
        url: data.url?.trim() || null,
        email: data.email?.trim() || null,
        passwordEnc: data.password ? encryptSecret(data.password) : null,
        cost: typeof data.cost === "number" && Number.isFinite(data.cost) ? data.cost : 0,
        currency: data.currency?.trim() || "GBP",
        billingCycle: data.billingCycle === "yearly" ? "yearly" : "monthly",
        renewalDate: data.renewalDate?.trim() || null,
        owner: data.owner?.trim() || null,
        notes: data.notes?.trim() || null,
        active: data.active !== false,
      },
    });

    return NextResponse.json(serialise(sub, false), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Create subscription error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
