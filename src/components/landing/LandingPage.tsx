import Image from "next/image";
import Link from "next/link";
import AuditForm from "@/components/AuditForm";
import { ReportPreview } from "@/components/landing/ReportPreview";
import { getMarketBenchmark } from "@/lib/market/benchmarks";
import { formatUsdFromCents } from "@/lib/format";
import { config } from "@/lib/config";
import type { LandingScope } from "@/lib/landing";

/**
 * Shared landing layout (Build Pack §7 "Public audit page"), rendered with a
 * per-page scope: the universal home page and the Bali / Dubai / London
 * campaign pages. Layout per docs/design-ref.md: sticky nav, editorial hero
 * with the audit form, product preview, how-it-works, evidence split with a
 * terminal panel, pricing tiers, FAQ, footer. All market figures come through
 * the scope from real scan data — never hardcoded.
 */
export function LandingPage({ scope }: { scope: LandingScope }) {
  const bench = getMarketBenchmark(scope.terminal.marketKey, "2BR");
  const priceLabel = formatUsdFromCents(config.reportPriceUsdCents);

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
    "Re-audit in 60 days at a discount",
  ];

  const faqs = [
    {
      q: "Where does the data come from?",
      a: "Live Airbnb market data via AirROI, which we scan and snapshot ourselves, plus an AI review of your actual listing photos and copy. Nothing in the report is opinion without a number behind it.",
    },
    {
      q: "Which listings do you compare mine against?",
      a: scope.faqMarketsAnswer,
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
      {/* Sticky nav */}
      <nav className="sticky top-0 z-50 border-b border-dove/70 bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <a href={scope.logoHref} className="flex items-center gap-2.5">
            <Image
              src="/logo/optimorent-mark-ink.png"
              alt="OptimoRent monogram"
              width={38}
              height={24}
              priority
            />
            <span className="text-lg font-medium tracking-[-0.02em]">OptimoRent</span>
          </a>
          <div className="hidden items-center gap-6 sm:flex">
            <a href="#how-it-works" className="text-sm font-medium text-fog hover:text-ink">
              How it works
            </a>
            <a href="#evidence" className="text-sm font-medium text-fog hover:text-ink">
              The evidence
            </a>
            <a href="#pricing" className="text-sm font-medium text-fog hover:text-ink">
              Pricing
            </a>
          </div>
          <a
            href="#audit"
            className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-charcoal"
          >
            {scope.ctaLabel}
          </a>
        </div>
      </nav>

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
            Free score · No account needed · {priceLabel} one-time for the full report
          </p>
        </section>

        {/* Product preview with gradient orb */}
        <section className="relative pb-24">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,168,136,0.5),transparent)] blur-[64px]"
          />
          <div className="mx-auto max-w-3xl">
            <ReportPreview scope={scope.preview} />
            <p className="mt-4 text-center font-mono text-[11px] uppercase tracking-wide text-pewter">
              {scope.preview.caption}
            </p>
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

        {/* Evidence: text left, terminal right */}
        <section id="evidence" className="scroll-mt-24 border-t border-dove py-20">
          <div className="grid items-center gap-12 sm:grid-cols-2">
            <div>
              <h2 className="text-3xl font-normal tracking-[-0.025em] sm:text-4xl">
                Built on measured data
              </h2>
              <p className="mt-5 text-base leading-relaxed text-steel">
                We analyzed{" "}
                <b className="font-medium text-ink">
                  {scope.evidence.listings.toLocaleString("en-US")} live Airbnb listings
                </b>{" "}
                across <b className="font-medium text-ink">{scope.evidence.marketPhrase}</b>,
                comparing the top earners with everyone else in each size
                class. Every recommendation in your report cites those numbers,
                and you see the actual winning listings next to yours.
              </p>
              <div className="mt-8 grid grid-cols-3 gap-4">
                {scope.evidence.stats.map((s) => (
                  <div key={s.label}>
                    <div className="text-xl">{s.value}</div>
                    <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-pewter">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Terminal panel: real 2BR scan output for this scope's market */}
            <div className="overflow-hidden rounded-xl bg-charcoal">
              <div className="flex items-center gap-2 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-ember" />
                <span className="h-2.5 w-2.5 rounded-full bg-sunbeam" />
                <span className="h-2.5 w-2.5 rounded-full bg-sprout" />
              </div>
              <div className="overflow-x-auto px-5 pb-5 font-mono text-xs leading-[1.85] text-dove">
                <p>
                  <span className="text-sprout">$</span> optimorent scan --market{" "}
                  {scope.terminal.marketKey}
                </p>
                <p className="text-fog">{scope.terminal.fetchedLine}</p>
                {bench && (
                  <>
                    <p className="text-fog">2BR winners vs the rest:</p>
                    <p className="text-fog">
                      {"  "}photos{"        "}
                      <span className="text-dove">
                        {Math.round(bench.winner_median_photos)} vs{" "}
                        {Math.round(bench.loser_median_photos)}
                      </span>
                    </p>
                    <p className="text-fog">
                      {"  "}description{"   "}
                      <span className="text-dove">
                        {bench.winner_median_description_chars.toLocaleString()} vs{" "}
                        {bench.loser_median_description_chars} chars
                      </span>
                    </p>
                    <p className="text-fog">
                      {"  "}occupancy{"     "}
                      <span className="text-dove">
                        {Math.round(bench.winner_median_occupancy * 100)}% median
                      </span>
                    </p>
                    <p className="text-fog">
                      {"  "}superhost{"     "}
                      <span className="text-dove">
                        {Math.round(bench.winner_superhost_share * 100)}% of winners
                      </span>
                    </p>
                  </>
                )}
                <p>
                  <span className="text-sprout">✓</span> benchmarks written ·
                  winners identified
                </p>
              </div>
            </div>
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
            <div className="rounded-2xl bg-cream p-10">
              <h3 className="text-2xl font-medium tracking-[-0.02em]">Full report</h3>
              <div className="mt-4 text-4xl tracking-[-0.025em]">
                {priceLabel}
                <span className="ml-2 font-mono text-xs uppercase tracking-wide text-pewter">
                  one-time
                </span>
              </div>
              <ul className="mt-8 flex flex-col gap-2">
                {paidFeatures.map((f) => (
                  <li key={f} className="flex gap-2.5 text-sm">
                    <span aria-hidden>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="#audit"
                className="mt-10 inline-block rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper hover:bg-charcoal"
              >
                Start with the free score
              </a>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-dove py-20">
          <h2 className="text-3xl font-normal tracking-[-0.025em] sm:text-4xl">
            Questions
          </h2>
          <div className="mt-8 max-w-2xl">
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
          <p className="text-xs text-pewter">© 2026 OptimoRent</p>
        </div>
      </footer>
    </div>
  );
}
