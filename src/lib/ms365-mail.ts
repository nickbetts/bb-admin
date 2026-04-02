/**
 * Microsoft Graph API helper for MS365 email + Teams meeting sync.
 *
 * Uses the OAuth2 refresh token stored in Ms365Connection to acquire a short-lived
 * access token, then queries the Graph /me/messages and /me/events endpoints to
 * find all emails and meetings related to a given set of client email addresses.
 *
 * Required OAuth scopes: Mail.Read Calendars.Read User.Read offline_access
 */

export interface GraphCalendarEvent {
  id: string;
  subject: string;
  bodyPreview: string;
  /** ISO datetime string */
  start: { dateTime: string; timeZone: string };
  /** ISO datetime string */
  end: { dateTime: string; timeZone: string };
  organizer: { emailAddress: { address: string; name: string } };
  attendees: Array<{
    emailAddress: { address: string; name: string };
    status: { response: string };
    type: string;
  }>;
  isOnlineMeeting: boolean;
  onlineMeetingProvider: string | null;
  onlineMeeting: { joinUrl: string } | null;
  webLink: string;
  isCancelled: boolean;
}

export interface GraphMessage {
  id: string;
  subject: string;
  bodyPreview: string;
  body: { content: string; contentType: string };
  from: { emailAddress: { address: string; name: string } };
  toRecipients: Array<{ emailAddress: { address: string; name: string } }>;
  ccRecipients: Array<{ emailAddress: { address: string; name: string } }>;
  receivedDateTime: string;
  sentDateTime: string | null;
  isDraft: boolean;
  conversationId: string;
}

/** Exchange a refresh token for a new access token via Azure AD. */
async function getAccessToken(refreshToken: string): Promise<string> {
  const tenantId = process.env.MS365_TENANT_ID ?? "common";
  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.MS365_CLIENT_ID!,
        client_secret: process.env.MS365_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope:
          "https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Calendars.Read https://graph.microsoft.com/User.Read offline_access",
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MS365 token refresh failed: ${text.slice(0, 200)}`);
  }

  const data = await res.json() as { access_token: string };
  return data.access_token;
}

/**
 * Fetch all emails from the connected mailbox that involve any of the given
 * client email addresses (appears in from, to, or cc).
 *
 * Returns up to `maxMessages` messages ordered by receivedDateTime desc.
 */
export async function fetchMailForClientAddresses(
  refreshToken: string,
  clientEmails: string[],
  maxMessages = 50
): Promise<GraphMessage[]> {
  if (clientEmails.length === 0) return [];

  const accessToken = await getAccessToken(refreshToken);

  // Build a $filter that matches any of the client email addresses in
  // from.emailAddress.address OR toRecipients/ccRecipients (Graph doesn't
  // support collection any() on recipients in basic filter, so we query
  // each inbox/sent folder separately using a search query instead).
  const emailList = clientEmails
    .map((e) => e.toLowerCase().trim())
    .filter(Boolean);

  // Use $search for flexible matching across from/to/cc
  // We query the mailbox messages with a search term per address
  const results: GraphMessage[] = [];
  const seen = new Set<string>();

  for (const email of emailList) {
    // Search inbox/sent for this address (Graph search covers all folders by default)
    const params = new URLSearchParams({
      $search: `"${email}"`,
      $top: String(Math.ceil(maxMessages / emailList.length)),
      $orderby: "receivedDateTime desc",
      $select: "id,subject,bodyPreview,body,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,isDraft,conversationId",
    });

    const res = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ConsistencyLevel: "eventual",
        },
      }
    );

    if (!res.ok) {
      console.error(`Graph messages fetch failed for ${email}:`, await res.text());
      continue;
    }

    const data = await res.json() as { value: GraphMessage[] };
    for (const msg of data.value ?? []) {
      if (!seen.has(msg.id) && !msg.isDraft) {
        seen.add(msg.id);
        results.push(msg);
      }
    }
  }

  // Sort combined results by date desc and trim to maxMessages
  results.sort(
    (a, b) =>
      new Date(b.receivedDateTime).getTime() -
      new Date(a.receivedDateTime).getTime()
  );

  return results.slice(0, maxMessages);
}

/** Determine email direction from the agency's mailbox address. */
export function getEmailDirection(
  msg: GraphMessage,
  mailboxAddress: string
): "inbound" | "outbound" {
  const from = msg.from?.emailAddress?.address?.toLowerCase() ?? "";
  return from === mailboxAddress.toLowerCase() ? "outbound" : "inbound";
}

/**
 * Fetch calendar events (including Teams meetings) from the connected mailbox
 * where any of the client email addresses appear as an attendee.
 *
 * Returns up to `maxEvents` events ordered by start time desc.
 */
export async function fetchMeetingsForClientAddresses(
  refreshToken: string,
  clientEmails: string[],
  maxEvents = 50
): Promise<GraphCalendarEvent[]> {
  if (clientEmails.length === 0) return [];

  const accessToken = await getAccessToken(refreshToken);
  const emailList = clientEmails
    .map((e) => e.toLowerCase().trim())
    .filter(Boolean);

  const results: GraphCalendarEvent[] = [];
  const seen = new Set<string>();

  // Query calendar events for each client address separately
  // Graph supports attendees/any() filter on the /me/events endpoint
  for (const email of emailList) {
    const params = new URLSearchParams({
      $filter: `attendees/any(a:a/emailAddress/address eq '${email}')`,
      $top: String(Math.ceil(maxEvents / emailList.length)),
      $orderby: "start/dateTime desc",
      $select:
        "id,subject,bodyPreview,start,end,organizer,attendees,isOnlineMeeting,onlineMeetingProvider,onlineMeeting,webLink,isCancelled",
    });

    const res = await fetch(
      `https://graph.microsoft.com/v1.0/me/events?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Prefer: "outlook.timezone=\"UTC\"",
        },
      }
    );

    if (!res.ok) {
      console.error(
        `Graph events fetch failed for ${email}:`,
        await res.text()
      );
      continue;
    }

    const data = (await res.json()) as { value: GraphCalendarEvent[] };
    for (const event of data.value ?? []) {
      if (!seen.has(event.id) && !event.isCancelled) {
        seen.add(event.id);
        results.push(event);
      }
    }
  }

  results.sort(
    (a, b) =>
      new Date(b.start.dateTime).getTime() -
      new Date(a.start.dateTime).getTime()
  );

  return results.slice(0, maxEvents);
}

/** Returns true if a calendar event was a Microsoft Teams meeting. */
export function isTeamsMeeting(event: GraphCalendarEvent): boolean {
  return (
    event.isOnlineMeeting &&
    event.onlineMeetingProvider === "teamsForBusiness"
  );
}
