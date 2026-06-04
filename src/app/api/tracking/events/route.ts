import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  validateEventName,
  validateEventParameters,
  validateFiringRules,
  type EventParameter,
  type FiringRule,
} from "@/lib/tracking-events";

export const dynamic = "force-dynamic";

type TrackingEventStatus = "DRAFT" | "ACTIVE";

interface TrackingEventPayload {
  trackingSetupId: string;
  eventName: string;
  eventCategory?: string | null;
  eventParameters?: EventParameter[];
  firingRules?: FiringRule[];
  status?: TrackingEventStatus;
}

function isTrackingEventStatus(value: unknown): value is TrackingEventStatus {
  return value === "DRAFT" || value === "ACTIVE";
}

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

async function requireTrackingPermission() {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!session.user.permissions.includes("manage_tracking")) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

async function loadSetup(setupId: string) {
  return prisma.trackingSetup.findUnique({
    where: { id: setupId },
    select: {
      id: true,
      clientId: true,
    },
  });
}

function serialiseEvent(event: {
  id: string;
  trackingSetupId: string;
  eventName: string;
  eventCategory: string | null;
  eventParameters: unknown;
  firingRules: unknown;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
}) {
  return {
    id: event.id,
    trackingSetupId: event.trackingSetupId,
    eventName: event.eventName,
    eventCategory: event.eventCategory,
    eventParameters: parseJsonField<EventParameter[]>(event.eventParameters, []),
    firingRules: parseJsonField<FiringRule[]>(event.firingRules, []),
    status: isTrackingEventStatus(event.status) ? event.status : "DRAFT",
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
    createdBy: event.createdBy,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireTrackingPermission();
  if ("error" in auth) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const setupId = searchParams.get("setupId");

    if (!setupId) {
      return NextResponse.json({ error: "setupId is required" }, { status: 400 });
    }

    const setup = await loadSetup(setupId);
    if (!setup) {
      return NextResponse.json({ error: "Tracking setup not found" }, { status: 404 });
    }

    const events = await prisma.trackingEvent.findMany({
      where: { trackingSetupId: setup.id },
      orderBy: [{ createdAt: "desc" }, { eventName: "asc" }],
    });

    return NextResponse.json(events.map(serialiseEvent));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Tracking events GET error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireTrackingPermission();
  if ("error" in auth) return auth.error;

  try {
    const body = (await request.json()) as TrackingEventPayload;
    const {
      trackingSetupId,
      eventName,
      eventCategory = null,
      eventParameters = [],
      firingRules = [],
      status = "DRAFT",
    } = body;

    if (!trackingSetupId) {
      return NextResponse.json({ error: "trackingSetupId is required" }, { status: 400 });
    }

    const nameCheck = validateEventName(eventName?.trim());
    if (!nameCheck.valid) {
      return NextResponse.json({ error: nameCheck.error }, { status: 400 });
    }

    const paramsCheck = validateEventParameters(eventParameters);
    if (!paramsCheck.valid) {
      return NextResponse.json({ error: paramsCheck.error }, { status: 400 });
    }

    const rulesCheck = validateFiringRules(firingRules);
    if (!rulesCheck.valid) {
      return NextResponse.json({ error: rulesCheck.error }, { status: 400 });
    }

    if (!isTrackingEventStatus(status)) {
      return NextResponse.json({ error: "Invalid event status" }, { status: 400 });
    }

    const setup = await loadSetup(trackingSetupId);
    if (!setup) {
      return NextResponse.json({ error: "Tracking setup not found" }, { status: 404 });
    }

    const created = await prisma.trackingEvent.create({
      data: {
        trackingSetupId: setup.id,
        eventName: eventName.trim(),
        eventCategory: eventCategory?.trim() || null,
        eventParameters: eventParameters as unknown as Prisma.InputJsonValue,
        firingRules: firingRules as unknown as Prisma.InputJsonValue,
        status,
        createdBy: auth.session.user.id,
      },
    });

    return NextResponse.json(serialiseEvent(created), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.toLowerCase().includes("unique constraint")) {
      return NextResponse.json(
        { error: "An event with this name already exists for this tracking setup" },
        { status: 409 },
      );
    }
    console.error("Tracking events POST error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireTrackingPermission();
  if ("error" in auth) return auth.error;

  try {
    const body = (await request.json()) as { eventId?: string; status?: TrackingEventStatus };
    const { eventId, status } = body;

    if (!eventId) {
      return NextResponse.json({ error: "eventId is required" }, { status: 400 });
    }

    if (!isTrackingEventStatus(status)) {
      return NextResponse.json({ error: "status must be DRAFT or ACTIVE" }, { status: 400 });
    }

    const updated = await prisma.trackingEvent.update({
      where: { id: eventId },
      data: { status },
    });

    return NextResponse.json(serialiseEvent(updated));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("Record to update not found")) {
      return NextResponse.json({ error: "Tracking event not found" }, { status: 404 });
    }
    console.error("Tracking events PUT error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireTrackingPermission();
  if ("error" in auth) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json({ error: "eventId is required" }, { status: 400 });
    }

    await prisma.trackingEvent.delete({ where: { id: eventId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("Record to delete does not exist")) {
      return NextResponse.json({ error: "Tracking event not found" }, { status: 404 });
    }
    console.error("Tracking events DELETE error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
