import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearClickrSessionCookie } from "@/lib/clickr-auth";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get("clickr_session")?.value;

  const response = NextResponse.json({ ok: true });

  if (token) {
    await clearClickrSessionCookie(token, response);
  }

  return response;
}
