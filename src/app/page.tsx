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
      ? `${trust.markets.slice(0, -1).join(", ")} and ${trust.markets[trust.markets.length - 1]}`
      : trust.markets[0];

  const stats = [
    { value: trust.listings.toLocaleString("en-US"), label: "listings measured" },
    { value: String(trust.markets.length), label: "markets scanned" },
    { value: "10", label: "winners shown beside yours" },
  ];

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-24 text-center">
      <p className="mb-8 font-mono text-xs uppercase tracking-[0.2em] text-fog">
        OptiRent · Listing Intelligence
      </p>

      <h1 className="text-[42px] font-normal leading-[1.04] tracking-[-0.025em] text-ink sm:text-6xl sm:leading-[1.0]">
        Your villa is leaving money on the table.
        <br />
        <span className="text-fog">We help you take it back.</span>
      </h1>

      <p className="mt-8 max-w-xl text-base leading-relaxed text-steel">
        Paste your Airbnb link. In about a minute you get a free listing score,
        an underpricing estimate against comparable villas, and a count of what
        needs fixing.
      </p>

      <AuditForm />

      {/* Trust signal: our analysis is measured, not opinion (manager ask 2026-07-14) */}
      <section className="mt-14 w-full max-w-xl rounded-2xl bg-cream px-8 py-7 text-left">
        <p className="text-base font-medium text-ink">Built on measured data</p>
        <p className="mt-2 text-sm leading-relaxed text-fog">
          We analyzed{" "}
          <b className="font-medium text-ink">
            {trust.listings.toLocaleString("en-US")} live Airbnb listings
          </b>{" "}
          across <b className="font-medium text-ink">{marketList}</b>, comparing
          the top earners with everyone else in each size class. Every
          recommendation in your report cites those numbers, and you see the
          actual winning listings next to yours.
        </p>
        <div className="mt-6 grid grid-cols-3 gap-4">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-lg text-ink">{s.value}</div>
              <div className="mt-0.5 font-mono text-[11px] uppercase tracking-wide text-pewter">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-6 font-mono text-[11px] uppercase tracking-wide text-pewter">
        Free score · No account needed
      </p>
    </main>
  );
}
