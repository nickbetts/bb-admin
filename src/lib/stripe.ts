import Stripe from "stripe";

/**
 * Stripe client singleton — mirrors the OpenAI client pattern.
 * Key is read from STRIPE_SECRET_KEY env var.
 */
let _stripe: Stripe | null = null;

export async function getStripeClient(): Promise<Stripe> {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured.");
  _stripe = new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
  return _stripe;
}

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

/** Derive plan tier from a Stripe Price ID. Returns "free" if not matched. */
export function tierFromPriceId(priceId: string | null | undefined): string {
  if (!priceId) return "free";
  if (priceId === process.env.STRIPE_STARTER_PRICE_ID) return "starter";
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return "pro";
  return "free";
}
