import { prisma } from "./prisma";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type NotificationType =
  | "anomaly"
  | "report_ready"
  | "report_sent"
  | "report_opened"
  | "proposal_viewed"
  | "integration_error"
  | "goal_at_risk"
  | "snapshot_complete";

export type NotificationChannel = "in_app" | "email" | "slack";

export interface CreateNotificationInput {
  userId: string;
  clientId?: string;
  type: NotificationType;
  severity?: "high" | "medium" | "low";
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  channel?: NotificationChannel;
}

interface NotificationPrefs {
  email: boolean;
  slack: boolean;
  slackWebhook?: string;
  digestFrequency: "immediate" | "daily" | "weekly";
  quietHoursStart?: string;
  quietHoursEnd?: string;
  enabledTypes: string[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function parsePrefs(raw: string | null | undefined): NotificationPrefs {
  if (!raw) {
    return {
      email: true,
      slack: false,
      digestFrequency: "immediate",
      enabledTypes: [
        "anomaly",
        "report_ready",
        "report_sent",
        "report_opened",
        "proposal_viewed",
        "integration_error",
        "snapshot_complete",
      ],
    };
  }
  try {
    return JSON.parse(raw) as NotificationPrefs;
  } catch {
    return { email: true, slack: false, digestFrequency: "immediate", enabledTypes: ["anomaly"] };
  }
}

function isInQuietHours(prefs: NotificationPrefs): boolean {
  if (!prefs.quietHoursStart || !prefs.quietHoursEnd) return false;
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const { quietHoursStart, quietHoursEnd } = prefs;
  if (quietHoursStart <= quietHoursEnd) {
    return hhmm >= quietHoursStart && hhmm <= quietHoursEnd;
  }
  // Wraps midnight
  return hhmm >= quietHoursStart || hhmm <= quietHoursEnd;
}

// ─── Core: create in-app notification ──────────────────────────────────────────

export async function createNotification(input: CreateNotificationInput) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      clientId: input.clientId ?? null,
      type: input.type,
      severity: input.severity ?? null,
      title: input.title,
      body: input.body,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      channel: input.channel ?? "in_app",
      status: "unread",
    },
  });
  return notification;
}

// ─── Deliver to all enabled channels ───────────────────────────────────────────

export async function notifyUser(input: CreateNotificationInput) {
  // Always create in-app notification
  const notification = await createNotification(input);

  // Check user prefs for additional delivery
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { notificationPrefs: true, email: true, name: true },
  });

  const prefs = parsePrefs(user?.notificationPrefs);

  // Skip external delivery during quiet hours (unless HIGH severity)
  if (isInQuietHours(prefs) && input.severity !== "high") {
    return notification;
  }

  // Skip if user disabled this notification type
  if (!prefs.enabledTypes.includes(input.type)) {
    return notification;
  }

  // Email delivery
  if (prefs.email && user?.email) {
    await deliverEmail(user.email, input.title, input.body).catch((err) =>
      console.error(
        "[notifications] Email delivery failed for user",
        input.userId,
        "type",
        input.type,
        ":",
        err,
      ),
    );
  }

  // Slack delivery
  if (prefs.slack && prefs.slackWebhook) {
    await deliverSlack(prefs.slackWebhook, input.title, input.body, input.severity).catch((err) =>
      console.error(
        "[notifications] Slack delivery failed for user",
        input.userId,
        "type",
        input.type,
        ":",
        err,
      ),
    );
  }

  return notification;
}

// ─── Broadcast to all admins ───────────────────────────────────────────────────

export async function notifyAdmins(input: Omit<CreateNotificationInput, "userId">) {
  const admins = await prisma.user.findMany({
    where: { role: "admin" },
    select: { id: true },
  });

  const results = await Promise.allSettled(
    admins.map((admin) => notifyUser({ ...input, userId: admin.id })),
  );

  return results.filter((r) => r.status === "fulfilled").length;
}

// ─── Email delivery (pluggable — uses fetch to external email service) ─────────

async function deliverEmail(to: string, subject: string, body: string) {
  // Check for configured email provider in AppSettings
  const settings = await prisma.appSetting.findMany({
    where: { key: { in: ["emailProvider", "emailApiKey", "emailFromAddress"] } },
  });
  const config = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  if (!config.emailApiKey) {
    console.log("[notifications] No email API key configured — skipping email delivery");
    return;
  }

  const fromAddress = config.emailFromAddress || "nick@bettsandburton.com";
  const provider = config.emailProvider || "resend";

  if (provider === "resend") {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.emailApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to,
        subject,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h2 style="color:#1a1a1a;margin:0 0 16px">${subject}</h2>
          <p style="color:#444;line-height:1.6">${body}</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
          <p style="color:#999;font-size:12px">Betts & Burton Report Platform</p>
        </div>`,
      }),
    });
  }
}

// ─── Slack delivery (webhook) ──────────────────────────────────────────────────

async function deliverSlack(webhookUrl: string, title: string, body: string, severity?: string) {
  const severityEmoji: Record<string, string> = {
    high: "🔴",
    medium: "🟡",
    low: "🔵",
  };

  const emoji = severity ? severityEmoji[severity] || "📋" : "📋";

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: `${emoji} ${title}` },
        },
        {
          type: "section",
          text: { type: "mrkdwn", text: body },
        },
      ],
    }),
  });
}
