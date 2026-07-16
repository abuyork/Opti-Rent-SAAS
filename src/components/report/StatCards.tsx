import { formatMoneyMonthly } from "@/lib/format";

/**
 * Four summary cards mirroring the sample report header.
 *
 * Manager QA 2026-07-16: a bare "Rp 0/mo" read as a bug (it means the listing
 * is priced at market, not that the audit found nothing), and "25 villas" hid
 * that the market cohort is measured on top of the nearby comps (AirROI's
 * comparables endpoint returns the closest 25). Each card now carries a short
 * mono note, and money renders in the market's native currency.
 */
export function StatCards({
  score,
  underpricingIdr,
  criticalCount,
  compCount,
  currency = "IDR",
  marketCohortSize = null,
}: {
  score: number;
  underpricingIdr: number;
  criticalCount: number;
  compCount: number;
  currency?: string;
  marketCohortSize?: number | null;
}) {
  const cards = [
    { label: "Listing score", value: `${score}/100`, note: null },
    underpricingIdr > 0
      ? {
          label: "Left on table",
          value: formatMoneyMonthly(currency, underpricingIdr),
          note: "vs the nearby comp median",
        }
      : {
          label: "Left on table",
          value: "None",
          note: "priced at market rate",
        },
    { label: "Critical fixes", value: String(criticalCount), note: null },
    marketCohortSize
      ? {
          label: "Compared against",
          value: `${compCount + marketCohortSize} villas`,
          note: `${compCount} nearby · ${marketCohortSize} market cohort`,
        }
      : {
          label: "Compared against",
          value: `${compCount} villas`,
          note: "closest comparables",
        },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl bg-cream px-5 py-5">
          <div className="font-mono text-[11px] uppercase tracking-wide text-pewter">
            {c.label}
          </div>
          <div className="mt-1.5 text-2xl tracking-[-0.02em] text-ink">{c.value}</div>
          {c.note && (
            <div className="mt-1 font-mono text-[10px] leading-relaxed text-pewter">
              {c.note}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
