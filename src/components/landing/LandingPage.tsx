import Image from "next/image";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import AuditForm from "@/components/AuditForm";
import { ReportPreview } from "@/components/landing/ReportPreview";
import { PreviewTabs } from "@/components/landing/PreviewTabs";
import { formatUsdFromCents } from "@/lib/format";
import { config } from "@/lib/config";
import { PLAYBOOKS } from "@/lib/playbooks";
import type { LandingScope } from "@/lib/landing";

/**
 * Shared landing layout (Build Pack §7 "Public audit page"), rendered with a
 * per-page scope: the universal home page and the Bali / Dubai / London
 * campaign pages. Layout per docs/design-ref.md: sticky nav, editorial hero
 * with the audit form, product preview, how-it-works, pricing tiers, FAQ,
 * footer. All market figures come through the scope from real scan data —
 * never hardcoded.
 */
export function LandingPage({ scope }: { scope: LandingScope }) {
  const priceLabel = formatUsdFromCents(config.reportPriceUsdCents);
  const playbookPrice = formatUsdFromCents(config.playbookPriceUsdCents);
  // Campaign pages cite only their own market, so the playbook pitch names just
  // that book; the universal page pitches the set.
  const book = scope.slug === "home" ? null : PLAYBOOKS[scope.slug];

  const steps = [
    {
      n: "01",
      title: "Paste your link",
      body: "Drop in your Airbnb URL. No account, no setup. We pull your listing's photos, copy, amenities, reviews, and pricing.",
    },
    {
      n: "02",
      title: "We benchmark it",
      body: "In about a minute, AI reviews your actual photos and copy, then measures you against the top earners in your exact market and size class.",
    },
    {
      n: "03",
      title: "Fix and earn",
      body: "You get a 0-100 score, an underpricing estimate, a fix list where every item cites market numbers, and paste-ready rewrites.",
    },
  ];

  const freeFeatures = [
    "Listing score, 0 to 100",
    "Underpricing estimate per month",
    "Problem count with severity mix",
    "Locked preview of your fix list",
  ];
  const paidFeatures = [
    "Full fix list, every item citing measured market numbers",
    "The 10 winning listings in your size class, with their real revenue and occupancy",
    "3 paste-ready title options plus a rewritten description opening",
    "Branded PDF report, link sent to your email",
  ];

  const faqs = [
    {
      q: "Where does the data come from?",
      a: "Live Airbnb market data, which we scan and snapshot ourselves, plus an AI review of your actual listing photos and copy. Nothing in the report is opinion without a number behind it.",
    },
    {
      q: "Which listings do you compare mine against?",
      a: scope.faqMarketsAnswer,
    },
    {
      q: "What is the Playbook, and how is it different from the report?",
      a: book
        ? `The report scores your listing. The ${book.title} is the market itself: ${book.pages} pages on what the top-earning ${book.noun} in ${book.place} do differently, measured against the bottom quartile in every size class. It is ${playbookPrice}, one-time, and it is the same research your report cites.`
        : `The report scores your listing. The Playbook is the market itself: what the top earners do differently, measured size class by size class, written up as one book per market. It is ${playbookPrice} one-time per market, and it is the same research your report cites.`,
    },
    {
      q: "Is the underpricing estimate guaranteed?",
      a: "No. It is a benchmark estimate from comparable listings, and it only covers listing-quality factors. Treat it as a measured starting point, not a promise.",
    },
    {
      q: `Is the ${priceLabel} a subscription?`,
      a: `No. ${priceLabel} is a one-time payment for one listing's full report. The free score costs nothing and never expires.`,
    },
  ];

  return (
    <div className="text-ink">
      <SiteNav
        logoHref={scope.logoHref}
        links={[
          { label: "How it works", href: "#how-it-works" },
          { label: "Pricing", href: "#pricing" },
        ]}
        cta={{ label: scope.ctaLabel, href: "#audit" }}
      />

      <main id="top" className="mx-auto max-w-5xl px-6">
        {/* Hero */}
        <section className="mx-auto max-w-3xl pt-20 pb-16 text-center sm:pt-28">
          <p className="mb-8 font-mono text-xs uppercase tracking-[0.2em] text-fog">
            {scope.kicker}
          </p>
          <h1 className="text-[42px] font-normal leading-[1.04] tracking-[-0.025em] sm:text-6xl sm:leading-[1.0]">
            {scope.heroHeadline}
            <br />
            <span className="text-fog">We help you take it back.</span>
          </h1>
          <p className="mx-auto mt-8 max-w-xl text-base leading-relaxed text-steel">
            {scope.heroSub}
          </p>
          <div id="audit" className="scroll-mt-24">
            <AuditForm ctaLabel={scope.ctaLabel} scoringLine={scope.scoringLine} />
          </div>
          <p className="mt-6 font-mono text-[11px] uppercase tracking-wide text-pewter">
            {scope.trustLine}
          </p>
        </section>

        {/* Product preview with gradient orb */}
        <section className="relative pb-24">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,168,136,0.5),transparent)] blur-[64px]"
          />
          <div className="mx-auto max-w-3xl">
            {scope.previewTabs ? (
              <PreviewTabs
                tabs={scope.previewTabs.map((t) => ({
                  key: t.key,
                  label: t.label,
                  content: (
                    <>
                      <ReportPreview scope={t.preview} />
                      <p className="mt-4 text-center font-mono text-[11px] uppercase tracking-wide text-pewter">
                        {t.preview.caption}
                      </p>
                    </>
                  ),
                }))}
              />
            ) : (
              <>
                <ReportPreview scope={scope.preview} />
                <p className="mt-4 text-center font-mono text-[11px] uppercase tracking-wide text-pewter">
                  {scope.preview.caption}
                </p>
              </>
            )}
          </div>
        </section>

        {/* Market cards — universal page only */}
        {scope.marketCards && (
          <section className="border-t border-dove py-20">
            <h2 className="text-3xl font-normal tracking-[-0.025em] sm:text-4xl">
              Pick your market
            </h2>
            <p className="mt-3 text-base text-fog">
              Every market gets its own scan. Your listing is only ever compared
              with its real neighbors.
            </p>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {scope.marketCards.map((c) => (
                <Link
                  key={c.href}
                  href={c.href}
                  className="group rounded-2xl bg-cream p-8 transition-shadow hover:shadow-[0_0_0_1px_rgba(10,10,10,0.15)]"
                >
                  <h3 className="text-2xl font-medium tracking-[-0.02em]">{c.title}</h3>
                  <div className="mt-4 flex flex-col gap-1">
                    {c.lines.map((l) => (
                      <p key={l} className="text-sm text-steel">
                        {l}
                      </p>
                    ))}
                  </div>
                  <p className="mt-6 font-mono text-[11px] uppercase tracking-wide text-fog group-hover:text-ink">
                    {c.title} listing audit →
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-24 border-t border-dove py-20">
          <h2 className="text-3xl font-normal tracking-[-0.025em] sm:text-4xl">
            How it works
          </h2>
          <div className="mt-10 grid gap-10 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n}>
                <div className="font-mono text-xs text-pewter">{s.n}</div>
                <h3 className="mt-2 text-lg font-medium">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fog">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-24 border-t border-dove py-20">
          <h2 className="text-3xl font-normal tracking-[-0.025em] sm:text-4xl">
            Pricing
          </h2>
          <p className="mt-3 text-base text-fog">
            Start free. Pay once if the numbers convince you.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl bg-cream p-10">
              <h3 className="text-2xl font-medium tracking-[-0.02em]">Free score</h3>
              <div className="mt-4 text-4xl tracking-[-0.025em]">$0</div>
              <ul className="mt-8 flex flex-col gap-2">
                {freeFeatures.map((f) => (
                  <li key={f} className="flex gap-2.5 text-sm">
                    <span aria-hidden>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="#audit"
                className="mt-10 inline-block rounded-full px-6 py-3 text-sm font-medium text-ink shadow-[0_0_0_1px_rgba(10,10,10,0.15)] hover:bg-paper"
              >
                Get your free score
              </a>
            </div>
            {/* Inverted so the paid tier is the one the eye lands on. */}
            <div className="rounded-2xl bg-ink p-10 text-paper">
              <h3 className="text-2xl font-medium tracking-[-0.02em]">Full report</h3>
              <div className="mt-4 text-4xl tracking-[-0.025em]">
                {priceLabel}
                <span className="ml-2 font-mono text-xs uppercase tracking-wide text-dove">
                  one-time
                </span>
              </div>
              <ul className="mt-8 flex flex-col gap-2">
                {paidFeatures.map((f) => (
                  <li key={f} className="flex gap-2.5 text-sm text-dove">
                    <span aria-hidden>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="#audit"
                className="mt-10 inline-block rounded-full bg-paper px-6 py-3 text-sm font-medium text-ink hover:bg-dove"
              >
                Start with the free score
              </a>
            </div>
          </div>
        </section>

        {/* Playbook cross-sell, in place of the bare divider under pricing */}
        <section className="py-14">
          <div className="rounded-2xl bg-sand px-8 py-10 sm:px-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-xl">
                <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-ember">
                  New
                </p>
                <h2 className="mt-2 text-2xl font-medium tracking-[-0.02em] sm:text-3xl">
                  {book ? `The ${book.place} Playbook` : "The Airbnb Playbook"}
                </h2>
                <p className="mt-3 text-base leading-relaxed text-steel">
                  {book
                    ? `${book.pages} pages on what the top-earning ${book.noun} in ${book.place} do differently, measured against the bottom quartile in every size class.`
                    : "Everything your report says about one listing, said about your whole market: what the top earners do differently, measured size class by size class. One book per market."}
                </p>
              </div>
              <Link
                href="/playbook"
                className="shrink-0 self-start rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper hover:bg-charcoal sm:self-auto"
              >
                See the playbook · {playbookPrice}
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-dove py-20">
          <h2 className="text-3xl font-normal tracking-[-0.025em] sm:text-4xl">
            Questions
          </h2>
          <div className="mt-8">
            {faqs.map((f) => (
              <details key={f.q} className="group border-b border-dove py-4">
                <summary className="cursor-pointer list-none text-sm font-medium marker:hidden">
                  <span className="flex items-center justify-between gap-4">
                    {f.q}
                    <span className="font-mono text-pewter transition-transform group-open:rotate-45">
                      +
                    </span>
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-fog">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-dove">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Image
                src="/logo/optimorent-mark-ink.png"
                alt="OptimoRent monogram"
                width={31}
                height={20}
              />
              <span className="text-base font-medium tracking-[-0.02em]">OptimoRent</span>
            </div>
            <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.15em] text-pewter">
              {scope.footerLine}
            </div>
          </div>
          <div className="flex flex-col gap-1 sm:items-end">
            <a
              href={`mailto:${config.email.contact}`}
              className="text-sm text-fog underline decoration-dove underline-offset-2 hover:text-ink hover:decoration-ink"
            >
              {config.email.contact}
            </a>
            <p className="text-xs text-pewter">© 2026 OptimoRent</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
