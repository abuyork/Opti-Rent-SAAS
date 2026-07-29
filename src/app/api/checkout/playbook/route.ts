import { NextResponse } from "next/server";
import { config } from "@/lib/config";
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
  let market: string;
  try {
    const body = (await req.json()) as { market?: string };
    if (!body.market) return NextResponse.json({ error: "Missing market" }, { status: 400 });
    market = body.market;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!isPlaybookKey(market)) {
    return NextResponse.json({ error: `No playbook for "${market}"` }, { status: 404 });
  }
  const playbook = PLAYBOOKS[market];
  const thanksUrl = `${config.appUrl}/playbook/thanks`;

  if (!stripeEnabled()) {
    // Keyless mock: signed thank-you link (no real charge), same shape as the
    // audit flow's mock unlock so local QA exercises the whole path.
    const url = `${thanksUrl}?market=${market}&token=${playbookMockToken(market)}`;
    return NextResponse.json({ url, mock: true });
  }

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
    metadata: { playbook_market: market },
    success_url: `${thanksUrl}?market=${market}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.appUrl}/playbook`,
  });

  return NextResponse.json({ url: session.url });
}
