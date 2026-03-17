import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await prisma.appSetting.findMany();
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return NextResponse.json(settings);
}

export async function PATCH(request: Request) {
  const body = await request.json() as Record<string, string>;
  const upserts = Object.entries(body).map(([key, value]) =>
    prisma.appSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    })
  );
  await Promise.all(upserts);
  return NextResponse.json({ ok: true });
}
