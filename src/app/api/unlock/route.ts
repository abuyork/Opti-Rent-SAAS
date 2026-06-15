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
  const { searchParams } = new URL(req.url);
  const auditId = searchParams.get("audit_id");
  if (!auditId) return NextResponse.json({ error: "Missing audit_id" }, { status: 400 });

  const store = getStore();
  const audit = await store.getAudit(auditId);
  if (!audit) return NextResponse.json({ error: "Audit not found" }, { status: 404 });

  const resultUrl = `${config.appUrl}/result/${auditId}`;

  if (stripeEnabled()) {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid" || session.metadata?.audit_id !== auditId) {
      return NextResponse.json({ error: "Payment not confirmed" }, { status: 402 });
    }
    await store.recordPayment({
      audit_id: auditId,
      amount_usd: config.reportPriceUsdCents,
      provider: "stripe",
      provider_ref: session.id,
      status: "paid",
    });
  } else {
    const token = searchParams.get("token") ?? "";
    if (!verifyUnlockToken(auditId, token)) {
      return NextResponse.json({ error: "Invalid unlock token" }, { status: 403 });
    }
    await store.markAuditPaid(auditId);
  }

  return NextResponse.redirect(resultUrl);
}
