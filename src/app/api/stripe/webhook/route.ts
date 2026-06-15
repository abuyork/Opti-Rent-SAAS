import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { config } from "@/lib/config";
import { getStripe, stripeEnabled } from "@/lib/stripe";

/**
 * Authoritative async payment confirmation (Build Pack §7). Stripe posts here on
 * checkout.session.completed; we verify the signature, mark the audit paid, and
 * record the payment. Requires the raw body for signature verification.
 */
export async function POST(req: Request) {
  if (!stripeEnabled() || !config.stripe.webhookSecret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const raw = await req.text();
  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, config.stripe.webhookSecret);
  } catch (e) {
    return NextResponse.json(
      { error: `Webhook signature failed: ${(e as Error).message}` },
      { status: 400 },
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      id: string;
      payment_status: string;
      metadata?: { audit_id?: string };
    };
    const auditId = session.metadata?.audit_id;
    if (auditId && session.payment_status === "paid") {
      await getStore().recordPayment({
        audit_id: auditId,
        amount_usd: config.reportPriceUsdCents,
        provider: "stripe",
        provider_ref: session.id,
        status: "paid",
      });
    }
  }

  return NextResponse.json({ received: true });
}
