import Stripe from "stripe";
import { config } from "@/lib/config";

let client: Stripe | null = null;

/** True when a real Stripe secret key is configured. */
export function stripeEnabled(): boolean {
  return Boolean(config.stripe.secretKey);
}

/** Lazily-constructed Stripe client. Throws if called without a secret key. */
export function getStripe(): Stripe {
  if (!config.stripe.secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set.");
  }
  if (!client) client = new Stripe(config.stripe.secretKey);
  return client;
}
