import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000");

  const cronSecret = process.env.CRON_SECRET;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cronSecret) headers["Authorization"] = `Bearer ${cronSecret}`;

  const res = await fetch(`${baseUrl}/api/cron/snapshots`, { method: "POST", headers });
  const data = await res.json();

  if (!res.ok) return NextResponse.json(data, { status: res.status });
  return NextResponse.json(data);
}
