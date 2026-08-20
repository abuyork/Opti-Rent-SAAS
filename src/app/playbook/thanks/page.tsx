import Link from "next/link";
import { cookies } from "next/headers";
import { config } from "@/lib/config";
import { REFERRAL_COOKIE, referralCookieShape } from "@/lib/ambassadors";
import { validReferral } from "@/lib/ambassadors-server";
import { getStripe, stripeEnabled } from "@/lib/stripe";
import { playbookDownloadToken, verifyPlaybookMockToken } from "@/lib/sign";
import { PLAYBOOKS, isPlaybookKey, playbookCompSet } from "@/lib/playbooks";
import { SiteNav, SITE_LINKS } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import TrackEvent from "@/components/TrackEvent";
import { gaValue } from "@/lib/analytics";

export const metadata = { title: "Your Playbook - OptimoRent" };

/**
 * Post-payment delivery. Stripe's success_url lands here; we confirm the
 * session is actually paid before minting a download token, so arriving with a
 * cancelled or fabricated session_id gets nothing. Mirrors /api/unlock's live
 * vs mock split.
 */
export default async function PlaybookThanks({
  searchParams,
}: {
  searchParams: Promise<{ market?: string; session_id?: string; token?: string }>;
}) {
  const { market = "", session_id: sessionId, token } = await searchParams;
  let buyerEmail: string | null = null;

  const notFound = (
    <Shell heading="We could not confirm that purchase.">
      <p className="mt-4 text-base leading-relaxed text-steel">
        If you were charged, forward the Stripe receipt to{" "}
        <a className="underline decoration-dove underline-offset-2" href={`mailto:${config.email.contact}`}>
          {config.email.contact}
        </a>{" "}
        and we will send the PDF straight back.
      </p>
      <Link href="/playbook" className="mt-8 inline-block rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-charcoal">
        Back to the playbooks
      </Link>
    </Shell>
  );

  if (!isPlaybookKey(market)) return notFound;
  const playbook = PLAYBOOKS[market];

  // Ambassador credited for this sale. Live: from the session metadata, the
  // playbook sale's only record (stamped at checkout). Mock: from the cookie,
  // so local QA exercises the same param.
  let referral: string | null = null;

  let paid = false;
  if (stripeEnabled()) {
    if (!sessionId) return notFound;
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      paid =
        session.payment_status === "paid" && session.metadata?.playbook_market === market;
      buyerEmail = session.customer_details?.email ?? null;
      // Shape check suffices: checkout only ever stamps table-validated slugs.
      referral = referralCookieShape(session.metadata?.referral);
    } catch (e) {
      console.error("[playbook/thanks] session lookup failed", e);
    }
  } else {
    paid = verifyPlaybookMockToken(market, token ?? "");
    referral = await validReferral((await cookies()).get(REFERRAL_COOKIE)?.value);
  }
  if (!paid) return notFound;

  const href = `/api/playbook/download?market=${market}&token=${playbookDownloadToken(market)}`;

  // Email the buyer their own copy of the link (Stripe collected the address;
  // the mock flow has none). Fire-and-forget: the button above already works.
  if (buyerEmail) {
    const { sendPlaybookEmail } = await import("@/lib/email");
    void sendPlaybookEmail({
      to: buyerEmail,
      playbookTitle: playbook.title,
      place: playbook.place,
      pages: playbook.pages,
      downloadUrl: `${config.appUrl}${href}`,
    }).catch((e) => console.error("[playbook/thanks] email failed", e));
  }

  return (
    <Shell heading={`${playbook.title} is yours.`}>
      {/* Only reached once the session is confirmed paid above. The Stripe
          session id is the transaction id, so a refresh is deduped by GA4
          rather than counted as a second sale. */}
      <TrackEvent
        event="purchase"
        params={{
          transaction_id: sessionId ?? `mock_${market}`,
          currency: "USD",
          value: gaValue(config.playbookPriceUsdCents),
          items: [{ item_id: `playbook_${market}`, item_name: playbook.title }],
          ...(referral ? { referral } : {}),
        }}
      />
      <p className="mt-4 text-base leading-relaxed text-steel">
        {playbook.pages} pages, built from {playbookCompSet(playbook)} live {playbook.noun} in{" "}
        {playbook.place}. The download button works for the next 72 hours, so save the file
        once it opens.
      </p>
      <a
        href={href}
        className="mt-8 inline-block rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-charcoal"
      >
        Download the PDF
      </a>
      <p className="mt-6 text-sm text-fog">
        Lost it later? Write to{" "}
        <a className="underline decoration-dove underline-offset-2" href={`mailto:${config.email.contact}`}>
          {config.email.contact}
        </a>{" "}
        and we will resend it.
      </p>
      {!stripeEnabled() && (
        <p className="mt-8 rounded-lg bg-sand px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] text-ink">
          Testing mode: delivered without payment (no STRIPE_SECRET_KEY set).
        </p>
      )}
    </Shell>
  );
}

/**
 * min-h-screen + flex-1 on main: this page holds four short lines, so the
 * footer used to land mid-viewport with dead white space under it (Max
 * 2026-08-07). The slack now goes above the footer instead of below it.
 */
function Shell({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col text-ink">
      {/* The buyer lands here from Stripe with no way back into the site, so
          this page carries the full menu, not just the playbook dropdown (Max
          2026-08-07). The CTA also refills the right-hand slot, which is what
          was leaving the lone dropdown stranded mid-nav. */}
      <SiteNav links={SITE_LINKS} cta={{ label: "Score my listing", href: "/#audit" }} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-24 text-center">
        <h1 className="text-3xl font-normal tracking-[-0.025em] sm:text-4xl">{heading}</h1>
        {children}
      </main>
      <SiteFooter line="Airbnb Playbook 26/27 · Bali, Dubai and London" />
    </div>
  );
}
