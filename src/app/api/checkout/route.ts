import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { config } from "@/lib/config";
import { getStripe, stripeEnabled } from "@/lib/stripe";
import { unlockToken } from "@/lib/sign";

/**
 * Start a one-time payment to unlock an audit (Build Pack §7).
 * - Live (Stripe key set): create a Checkout Session → return its URL.
 * - Mock (no key): return a signed local unlock URL so the flow works keyless.
 */
export async function POST(req: Request) {
  let auditId: string;
  try {
    const body = (await req.json()) as { auditId?: string };
    if (!body.auditId) return NextResponse.json({ error: "Missing auditId" }, { status: 400 });
    auditId = body.auditId;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const store = getStore();
  const audit = await store.getAudit(auditId);
  if (!audit) return NextResponse.json({ error: "Audit not found" }, { status: 404 });

  // Already unlocked — just send them back to the report.
  if (audit.paid) {
    return NextResponse.json({ url: `${config.appUrl}/result/${auditId}` });
  }

  const resultUrl = `${config.appUrl}/result/${auditId}`;

  if (!stripeEnabled()) {
    // Keyless mock: signed unlock link (no real charge).
    const token = unlockToken(auditId);
    const url = `${config.appUrl}/api/unlock?audit_id=${auditId}&token=${token}`;
    return NextResponse.json({ url, mock: true });
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: audit.email,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: config.reportPriceUsdCents,
          product_data: {
            name: "OptimoRent full villa listing report",
            description: "Full fix list, paste-ready rewrites, and branded PDF.",
          },
        },
        quantity: 1,
      },
    ],
    metadata: { audit_id: auditId },
    success_url: `${config.appUrl}/api/unlock?audit_id=${auditId}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: resultUrl,
  });

  await store.recordPayment({
    audit_id: auditId,
    amount_usd: config.reportPriceUsdCents,
    provider: "stripe",
    provider_ref: session.id,
    status: "pending",
  });

  return NextResponse.json({ url: session.url });
}
