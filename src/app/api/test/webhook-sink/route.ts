import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface WebhookSinkEvent {
  at: string;
  status: number;
  payload: Record<string, unknown>;
}

declare global {
  var __lpWebhookSinkEvents: WebhookSinkEvent[] | undefined;
}

function isEnabled(): boolean {
  return process.env.ENABLE_E2E_TEST_ENDPOINTS === "1";
}

function getStore(): WebhookSinkEvent[] {
  if (!globalThis.__lpWebhookSinkEvents) {
    globalThis.__lpWebhookSinkEvents = [];
  }
  return globalThis.__lpWebhookSinkEvents;
}

function parseStatus(raw: string | null): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed)) return 200;
  if (parsed < 100 || parsed > 599) return 200;
  return parsed;
}

export async function GET(request: NextRequest) {
  if (!isEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const clear = searchParams.get("clear") === "1";
  const events = getStore();

  const response = { count: events.length, events: [...events] };
  if (clear) {
    events.length = 0;
  }

  return NextResponse.json(response);
}

export async function POST(request: NextRequest) {
  if (!isEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const status = parseStatus(searchParams.get("status"));

  let payload: Record<string, unknown> = {};
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    payload = {};
  }

  const events = getStore();
  events.push({
    at: new Date().toISOString(),
    status,
    payload,
  });

  if (events.length > 200) {
    events.splice(0, events.length - 200);
  }

  if (status >= 400) {
    return NextResponse.json({ error: `Webhook sink forced ${status}` }, { status });
  }

  return NextResponse.json({ ok: true, status });
}
