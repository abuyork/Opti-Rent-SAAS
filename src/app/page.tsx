import AuditForm from "@/components/AuditForm";
import { getTrustStats } from "@/lib/market/benchmarks";

/**
 * Landing / public audit entry page (Build Pack §7 "Public audit page").
 * Hero + interactive audit flow (URL → email gate → progress → free result).
 * Trust strip is computed from the real market-scan data — never hardcoded.
 */
export default function Home() {
  const trust = getTrustStats();
  const marketList =
    trust.markets.length > 1
      ? `${trust.markets.slice(0, -1).join(", ")} & ${trust.markets[trust.markets.length - 1]}`
      : trust.markets[0];

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
      <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-brand-teal">
        OptiRent
      </p>

      <h1 className="text-4xl font-bold leading-tight text-brand-navy sm:text-5xl">
        Your villa is leaving money on the table.
        <br />
        <span className="text-brand-teal">We help you take it back.</span>
      </h1>

      <p className="mt-6 max-w-xl text-lg text-brand-muted">
        Paste your Airbnb villa URL and get a free listing score, an underpricing
        estimate against comparable villas, and a problem count — in seconds.
      </p>

      <AuditForm />

      {/* Trust signal: our analysis is measured, not opinion (manager ask 2026-07-14) */}
      <section className="mt-10 w-full max-w-xl rounded-lg border border-brand-line bg-brand-card px-5 py-4">
        <p className="text-sm font-semibold text-brand-navy">
          Not guesswork — measured.
        </p>
        <p className="mt-1 text-sm text-brand-muted">
          We analyzed <b className="text-brand-ink">{trust.listings.toLocaleString("en-US")} live
          Airbnb listings</b> across <b className="text-brand-ink">{marketList}</b> — comparing the
          top earners against the rest, size class by size class. Every
          recommendation in your report cites those numbers, and you&apos;ll see the
          actual winning listings next to yours.
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs text-brand-muted">
          <span>📊 {trust.listings.toLocaleString("en-US")} listings measured</span>
          <span>🌍 {trust.markets.length} markets</span>
          <span>🤖 AI reviews your actual photos</span>
        </div>
      </section>

      <p className="mt-4 text-xs text-brand-muted">
        Free score · No account needed · {marketList}
      </p>
    </main>
  );
}
