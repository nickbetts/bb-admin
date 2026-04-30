/**
 * Clickr public user auth helpers.
 *
 * TODO: Implement — see src/app/(clickr)/CLICKR_PLAN.md § Phase 3
 *
 * Pattern: mirrors src/lib/auth.ts (HMAC-SHA256 + SESSION_SECRET).
 * Cookie name: "clickr_session" (separate from internal "session_token").
 */

export interface ClickrSessionUser {
  id: string;
  email: string;
  name: string | null;
  planTier: string;   // "free" | "starter" | "pro"
  planStatus: string; // "active" | "past_due" | "cancelled" | "disabled"
  lpsThisMonth: number;
}

export type ClickrSession = { user: ClickrSessionUser };

// TODO: Implement
export async function getClickrSession(): Promise<ClickrSession | null> {
  return null;
}

// TODO: Implement
export async function setClickrSessionCookie(
  _userId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _response: unknown,
): Promise<void> {}

// TODO: Implement
export function clearClickrSessionCookie(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _token: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _response: unknown,
): void {}
