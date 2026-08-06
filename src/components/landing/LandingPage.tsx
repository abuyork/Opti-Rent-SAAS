import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
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
    "Listing score, 0-100",
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
        {/* overflow-x-clip (not hidden) contains the form glow's horizontal
            spill on narrow screens without creating a scroll container. */}
        <section className="overflow-x-clip pt-20 pb-16 text-center sm:pt-28">
          <p className="mb-8 font-mono text-xs uppercase tracking-[0.2em] text-fog">
            {scope.kicker}
          </p>
          {/* lg is text-5xl because the longest scope headline (Dubai, 20em at
              this tracking) must fit the 5xl column on one line. */}
          <h1 className="text-[42px] font-normal leading-[1.04] tracking-[-0.025em] sm:text-6xl sm:leading-[1.0] lg:text-5xl">
            <span className="block lg:whitespace-nowrap">{scope.heroHeadline}</span>
            <span className="block text-fog">We help you take it back.</span>
          </h1>
          <p className="mx-auto mt-8 max-w-xl text-base leading-relaxed text-steel">
            {scope.heroSub}
          </p>
          {/* z-0 creates the stacking context that keeps the -z-10 glow behind
              the form's content but above the page background. scroll-mt stays
              at 24 (not the sections' 16): this target has no border-t, so it
              needs its own breathing room below the nav. */}
          <div
            id="audit"
            className="relative z-0 mx-auto max-w-xl scroll-mt-24 before:pointer-events-none before:absolute before:-inset-x-[160px] before:-inset-y-[88px] before:-z-10 before:bg-[radial-gradient(50%_50%_at_50%_50%,rgba(255,168,136,0.40),rgba(255,168,136,0.28)_40%,rgba(255,168,136,0.13)_65%,rgba(255,168,136,0.04)_85%,rgba(255,168,136,0)_100%)] before:blur-[20px] before:content-['']"
          >
            <AuditForm ctaLabel={scope.ctaLabel} scoringLine={scope.scoringLine} />
            <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.15em] text-pewter">
              {scope.trustLine}
            </p>
          </div>
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
                      <p className="mt-4 text-center font-mono text-[11px] uppercase tracking-[0.15em] text-pewter">
                        {t.preview.caption}
                      </p>
                    </>
                  ),
                }))}
              />
            ) : (
              <>
                <ReportPreview scope={scope.preview} />
                <p className="mt-4 text-center font-mono text-[11px] uppercase tracking-[0.15em] text-pewter">
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
            <p className="mt-3 text-base text-steel">
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
                  <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.15em] text-fog group-hover:text-ink">
                    {c.title} listing audit →
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* How it works */}
        {/* scroll-mt-16 = the nav's h-16, so anchored scrolls land this
            section's border-t flush under the sticky nav instead of floating
            a gap below it (Max 2026-08-06). */}
        <section id="how-it-works" className="scroll-mt-16 border-t border-dove py-20">
          <h2 className="text-3xl font-normal tracking-[-0.025em] sm:text-4xl">
            How it works
          </h2>
          <div className="mt-10 grid gap-10 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n}>
                <div className="font-mono text-xs text-pewter">{s.n}</div>
                <h3 className="mt-2 text-lg font-medium">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-steel">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-16 border-t border-dove py-20">
          <h2 className="text-3xl font-normal tracking-[-0.025em] sm:text-4xl">
            Pricing
          </h2>
          <p className="mt-3 text-base text-steel">
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
                Get my free score
              </a>
            </div>
            {/* Inverted so the paid tier is the one the eye lands on. */}
            <div className="rounded-2xl bg-ink p-10 text-paper">
              <h3 className="text-2xl font-medium tracking-[-0.02em]">Full report</h3>
              <div className="mt-4 text-4xl tracking-[-0.025em]">
                {priceLabel}
                <span className="ml-2 font-mono text-xs uppercase tracking-[0.15em] text-dove">
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
                className="mt-10 inline-block rounded-full bg-paper px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-dove"
              >
                Start with the free score
              </a>
            </div>
          </div>
        </section>

        {/* Playbook cross-sell — a one-line strip that IS the divider under
            pricing, not a card competing with the tiers above it. Campaign
            pages deep-link to their own region's playbook page; the reader
            there has already picked a market. */}
        <section className="border-t border-dove">
          <Link
            href={book ? `/playbook/${book.key}` : "/playbook"}
            className="group flex flex-col gap-2 py-6 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8"
          >
            <p className="text-sm leading-relaxed text-fog">
              <span className="font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-ember">
                New
              </span>{" "}
              <span className="font-medium text-ink">
                {book ? `The ${book.place} Playbook` : "The Airbnb Playbook"}
              </span>{" "}
              ·{" "}
              {book
                ? `${book.pages} pages on what the top-earning ${book.noun} in ${book.place} do differently.`
                : "What the top earners in your market do differently, measured size class by size class."}
            </p>
            <span className="shrink-0 whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.15em] text-fog group-hover:text-ink">
              See the playbook · {playbookPrice} →
            </span>
          </Link>
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

      <SiteFooter line={scope.footerLine} />
    </div>
  );
}
