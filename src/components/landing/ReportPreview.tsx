import Image from "next/image";
import { getMarketBenchmark } from "@/lib/market/benchmarks";
import { formatMoney, formatMoneyMonthly } from "@/lib/format";
import type { LandingPreviewScope } from "@/lib/landing";

const pct = (v: number) => `${Math.round(v * 100)}%`;

/**
 * Product preview for the landing pages: a miniature of the real audit report
 * inside a cream "window" card (design-ref: product-screenshot imagery, flat
 * cream container, traffic-light chrome). The winner row and benchmark figures
 * are pulled from the scope's live market scan; the headline stats are a
 * labeled sample (Bali mirrors a real audited villa, other markets derive a
 * sample gap from the measured winner ADR — see lib/landing.ts).
 */
export function ReportPreview({ scope }: { scope: LandingPreviewScope }) {
  const b = getMarketBenchmark(scope.marketKey, scope.cohort);
  const winner = b?.winner_covers[0];

  const stats = [
    { label: "Listing score", value: "68/100" },
    {
      label: "Left on table",
      value: formatMoneyMonthly(b?.currency ?? "IDR", scope.underpricingNightly),
    },
    { label: "Critical fixes", value: "3" },
    { label: "Comp set", value: scope.compSetLabel },
  ];

  return (
    <div className="overflow-hidden rounded-2xl bg-cream shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_18px_40px_-24px_rgba(15,23,42,0.18)]">
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-5 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-ember" />
        <span className="h-2.5 w-2.5 rounded-full bg-sunbeam" />
        <span className="h-2.5 w-2.5 rounded-full bg-sprout" />
        <span className="ml-3 font-mono text-[11px] uppercase tracking-[0.15em] text-pewter">
          optimorent · sample report · {scope.windowLabel}
        </span>
      </div>

      {/* Report sheet */}
      <div className="border-t border-dove/60 bg-paper px-5 py-5 sm:px-7 sm:py-6">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg bg-cream px-3.5 py-3">
              <div className="font-mono text-[10px] uppercase tracking-wide text-pewter">
                {s.label}
              </div>
              <div className="mt-1 text-lg tracking-[-0.02em] text-ink">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-lg border border-dove px-4 py-3">
          <div className="flex items-start gap-2">
            <span className="inline-block rounded-full bg-sev-critical-bg px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide text-sev-critical">
              critical
            </span>
            <p className="text-xs leading-relaxed text-ink sm:text-sm">
              <span className="font-medium">{scope.fixHeadline}</span> {scope.fixDetail}
            </p>
          </div>
          {b && (
            <p className="mt-2 pl-1 font-mono text-[10px] text-pewter">
              Basis: winners run {Math.round(b.winner_median_photos)} photos, weak
              listings {Math.round(b.loser_median_photos)}
            </p>
          )}
        </div>

        {winner && b && (
          <div className="mt-3 flex overflow-hidden rounded-lg border border-dove">
            <div className="relative h-24 w-28 shrink-0 sm:w-40">
              <Image
                src={winner.cover_photo_url}
                alt={`Winning cover: ${winner.listing_name}`}
                fill
                sizes="160px"
                className="object-cover"
              />
            </div>
            <div className="flex min-w-0 flex-col justify-center gap-1 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="shrink-0 rounded-full bg-sand px-2 py-0.5 font-mono text-[10px] font-medium text-ink">
                  #1 · Popularity {winner.viral_score}
                </span>
                <p className="truncate text-xs font-medium text-ink sm:text-sm">
                  {winner.listing_name}
                </p>
              </div>
              <div className="flex flex-wrap gap-x-4 text-xs text-ink">
                <span>
                  <b className="font-medium">{formatMoney(b.currency, winner.ttm_revpar)}</b>
                  <span className="text-fog"> per available night</span>
                </span>
                <span>
                  <b className="font-medium">{pct(winner.ttm_occupancy)}</b>
                  <span className="text-fog"> booked</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
