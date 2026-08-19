import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { config } from "@/lib/config";
import { getStripe, stripeEnabled } from "@/lib/stripe";
import { verifyUnlockToken } from "@/lib/sign";

/**
 * Unlock endpoint hit after payment, then redirects to the report.
 * - Mock: ?audit_id=&token=  → verify signed token.
 * - Live: ?audit_id=&session_id=  → verify the Stripe session is paid.
 * The Stripe webhook is the authoritative async confirmation; this gives the
 * paying user an immediate unlock without waiting on webhook delivery.
 */
export async function GET(req: Request) {
  // A buyer can land here in a browser tab straight from Stripe, so error
  // strings must read like a product and say what to do about a real charge
  // (pre-launch QA 2026-08-06). Technical detail goes to the server log.
  const brokenLink = `This unlock link is incomplete. If you just paid, write to ${config.email.contact} and we'll unlock your report.`;
  const { searchParams } = new URL(req.url);
  const auditId = searchParams.get("audit_id");
  if (!auditId) {
    console.error("[/api/unlock] missing audit_id");
    return NextResponse.json({ error: brokenLink }, { status: 400 });
  }

  const store = getStore();
  const audit = await store.getAudit(auditId);
  if (!audit) {
    console.error(`[/api/unlock] audit not found: ${auditId}`);
    return NextResponse.json(
      { error: `We couldn't find that audit. If you just paid, write to ${config.email.contact}.` },
      { status: 404 },
    );
  }

  const resultUrl = `${config.appUrl}/result/${auditId}`;
  // Same page, flagged as freshly bought so the result page can fire exactly
  // one analytics purchase event. Cancel links keep using the plain URL.
  const purchasedUrl = `${resultUrl}?purchased=1`;

  if (stripeEnabled()) {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      console.error(`[/api/unlock] missing session_id for audit ${auditId}`);
      return NextResponse.json({ error: brokenLink }, { status: 400 });
    }
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid" || session.metadata?.audit_id !== auditId) {
      console.error(
        `[/api/unlock] payment not confirmed for audit ${auditId}: status=${session.payment_status}, meta=${session.metadata?.audit_id}`,
      );
      return NextResponse.json(
        {
          error: `We couldn't confirm that payment. If you were charged, forward your Stripe receipt to ${config.email.contact} and we'll unlock your report.`,
        },
        { status: 402 },
      );
    }
    // Record what Stripe actually charged, not today's list price: a session
    // opened before a price change completes at the OLD amount, and the
    // payments ledger must say what the buyer paid (price cut 2026-08-10).
    await store.recordPayment({
      audit_id: auditId,
      amount_usd: session.amount_total ?? config.reportPriceUsdCents,
      provider: "stripe",
      provider_ref: session.id,
      status: "paid",
    });
  } else {
    const token = searchParams.get("token") ?? "";
    if (!verifyUnlockToken(auditId, token)) {
      console.error(`[/api/unlock] invalid mock token for audit ${auditId}`);
      return NextResponse.json(
        { error: "This unlock link is invalid or has expired." },
        { status: 403 },
      );
    }
    await store.markAuditPaid(auditId);
  }

  return NextResponse.redirect(purchasedUrl);
}
