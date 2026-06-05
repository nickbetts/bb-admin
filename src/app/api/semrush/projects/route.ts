import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json(
    {
      error: "SEMrush integration has been retired. Use Search Console and GA4 for SEO reporting.",
    },
    { status: 410 },
  );
}

export async function POST(_request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json(
    {
      error: "SEMrush integration has been retired. Use Search Console and GA4 for SEO reporting.",
    },
    { status: 410 },
  );
}
