/**
 * Stripe client singleton.
 *
 * TODO: Implement — see src/app/(clickr)/CLICKR_PLAN.md § Phase 2
 *
 * Pattern: mirrors src/lib/openai-client.ts singleton.
 * Install first: npm install stripe
 */

// Plan limits — free is a lifetime cap, starter/pro are monthly
export const PLAN_LIMITS: Record<string, number> = {
  free: 1,
  starter: 10,
  pro: Infinity,
};

// Populated from env vars set in Stripe dashboard
export const PLAN_PRICE_IDS: Record<string, string | undefined> = {
  starter: process.env.STRIPE_STARTER_PRICE_ID,
  pro: process.env.STRIPE_PRO_PRICE_ID,
};

// TODO: npm install stripe, then replace this stub with the real singleton
export async function getStripeClient(): Promise<never> {
  throw new Error("Stripe not yet implemented — see src/app/(clickr)/CLICKR_PLAN.md");
}
