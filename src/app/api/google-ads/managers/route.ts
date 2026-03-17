import { NextResponse } from "next/server";
import { listAccessibleCustomers } from "@/lib/google-ads";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const accounts = await listAccessibleCustomers();
    return NextResponse.json(accounts);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
