import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { config } from "@/lib/config";
import { REFERRAL_COOKIE, referralFromCookie } from "@/lib/ambassadors";
import { getStripe, stripeEnabled } from "@/lib/stripe";
import { playbookMockToken } from "@/lib/sign";
import { PLAYBOOKS, isPlaybookKey } from "@/lib/playbooks";

/**
 * Start a one-time payment for one market playbook PDF.
 *
 * Mirrors /api/checkout (the audit unlock), with one difference: a playbook has
 * no audit row, so the market key travels in the Stripe session metadata and
 * the thank-you page verifies against that.
 * - Live (Stripe key set): create a Checkout Session → return its URL.
 * - Mock (no key): return a signed thank-you URL so the flow works keyless.
 */
export async function POST(req: Request) {
  // Same rule as /api/checkout: these strings render under the buy button, so
  // they read like a product; the technical cause goes to the server log.
  const RETRY_MSG = "We couldn't start the checkout. Refresh the page and try again.";
  let market: string;
  try {
    const body = (await req.json()) as { market?: string };
    if (!body.market) {
      console.error("[/api/checkout/playbook] missing market in body");
      return NextResponse.json({ error: RETRY_MSG }, { status: 400 });
    }
    market = body.market;
  } catch {
    console.error("[/api/checkout/playbook] unparseable request body");
    return NextResponse.json({ error: RETRY_MSG }, { status: 400 });
  }

  if (!isPlaybookKey(market)) {
    console.error(`[/api/checkout/playbook] unknown market: "${market}"`);
    return NextResponse.json(
      { error: "That Playbook isn't available." },
      { status: 404 },
    );
  }
  const playbook = PLAYBOOKS[market];
  const thanksUrl = `${config.appUrl}/playbook/thanks`;

  if (!stripeEnabled()) {
    // Keyless mock: signed thank-you link (no real charge), same shape as the
    // audit flow's mock unlock so local QA exercises the whole path.
    const url = `${thanksUrl}?market=${market}&token=${playbookMockToken(market)}`;
    return NextResponse.json({ url, mock: true });
  }

  // Ambassador attribution: playbooks have no DB rows, so the referral slug in
  // the session metadata IS the sales record (counted in the Stripe dashboard).
  // Cookie stamped by src/proxy.ts, registry-validated here.
  const referral = referralFromCookie((await cookies()).get(REFERRAL_COOKIE)?.value);

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: config.playbookPriceUsdCents,
          product_data: {
            name: playbook.title,
            description: `${playbook.pages}-page ${playbook.place} market playbook, PDF.`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: { playbook_market: market, ...(referral ? { referral } : {}) },
    success_url: `${thanksUrl}?market=${market}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.appUrl}/playbook/${market}`,
  });

  return NextResponse.json({ url: session.url });
}
