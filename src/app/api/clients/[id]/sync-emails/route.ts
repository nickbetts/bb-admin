import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  fetchMailForClientAddresses,
  fetchMeetingsForClientAddresses,
  getEmailDirection,
} from "@/lib/ms365-mail";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Parse the stored contact email addresses
    let contactEmails: string[] = [];
    const clientAny = client as any;
    if (clientAny.contactEmails) {
      try {
        const parsed = JSON.parse(clientAny.contactEmails as string);
        if (Array.isArray(parsed)) contactEmails = parsed as string[];
      } catch {
        // Fallback: treat as comma-separated
        contactEmails = (clientAny.contactEmails as string)
          .split(",")
          .map((e: string) => e.trim())
          .filter(Boolean);
      }
    }

    if (contactEmails.length === 0) {
      return NextResponse.json(
        { error: "No contact emails configured for this client" },
        { status: 400 }
      );
    }

    const connections = await (prisma as any).ms365Connection.findMany();
    if (connections.length === 0) {
      return NextResponse.json(
        { error: "No Microsoft 365 accounts connected" },
        { status: 400 }
      );
    }

    let emailsSynced = 0;
    let meetingsSynced = 0;

    for (const connection of connections as Array<{
      id: string;
      email: string;
      refreshToken: string;
    }>) {
      // ── Emails ────────────────────────────────────────────────────────────
      try {
        const messages = await fetchMailForClientAddresses(
          connection.refreshToken,
          contactEmails,
          100
        );

        for (const msg of messages) {
          // Skip if already synced
          const existing = await (prisma as any).clientCommunication.findFirst({
            where: { externalMessageId: msg.id },
          });
          if (existing) continue;

          const direction = getEmailDirection(msg, connection.email);
          const toList = msg.toRecipients
            .map((r) => `${r.emailAddress.name} <${r.emailAddress.address}>`)
            .join(", ");
          const fromStr = `${msg.from?.emailAddress?.name ?? ""} <${msg.from?.emailAddress?.address ?? ""}>`;

          await (prisma as any).clientCommunication.create({
            data: {
              clientId: id,
              userId: session.user.id,
              type: "email",
              direction,
              subject: msg.subject || "(no subject)",
              body: msg.bodyPreview || null,
              status: "sent",
              externalMessageId: msg.id,
              sentAt: new Date(msg.receivedDateTime),
              metadata: JSON.stringify({
                fromAddress: msg.from?.emailAddress?.address,
                fromName: msg.from?.emailAddress?.name,
                toAddresses: toList,
                conversationId: msg.conversationId,
                ms365AccountId: connection.id,
              }),
            },
          });
          emailsSynced++;
        }
      } catch (err) {
        console.error(
          `Email sync failed for connection ${connection.email}:`,
          err
        );
      }

      // ── Meetings ──────────────────────────────────────────────────────────
      try {
        const events = await fetchMeetingsForClientAddresses(
          connection.refreshToken,
          contactEmails,
          100
        );

        for (const event of events) {
          const existing = await (prisma as any).clientCommunication.findFirst({
            where: { externalMessageId: event.id },
          });
          if (existing) continue;

          const isTeams =
            event.isOnlineMeeting &&
            event.onlineMeetingProvider === "teamsForBusiness";

          const attendeeList = event.attendees
            .map((a) => `${a.emailAddress.name} <${a.emailAddress.address}>`)
            .join(", ");

          await (prisma as any).clientCommunication.create({
            data: {
              clientId: id,
              userId: session.user.id,
              type: "meeting",
              direction: "outbound",
              subject: event.subject || "(no title)",
              body: event.bodyPreview || null,
              status: "sent",
              externalMessageId: event.id,
              sentAt: new Date(event.start.dateTime),
              metadata: JSON.stringify({
                startTime: event.start.dateTime,
                endTime: event.end.dateTime,
                attendees: attendeeList,
                organizer: event.organizer?.emailAddress?.address,
                isTeamsMeeting: isTeams,
                joinUrl: event.onlineMeeting?.joinUrl ?? null,
                webLink: event.webLink,
                ms365AccountId: connection.id,
              }),
            },
          });
          meetingsSynced++;
        }
      } catch (err) {
        console.error(
          `Meeting sync failed for connection ${connection.email}:`,
          err
        );
      }
    }

    return NextResponse.json({ emailsSynced, meetingsSynced });
  } catch (error) {
    console.error("Sync emails error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
