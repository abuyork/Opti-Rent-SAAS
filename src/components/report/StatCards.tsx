import { formatRupiahMonthly } from "@/lib/format";

/** Four summary cards mirroring the sample report header. */
export function StatCards({
  score,
  underpricingIdr,
  criticalCount,
  compCount,
}: {
  score: number;
  underpricingIdr: number;
  criticalCount: number;
  compCount: number;
}) {
  const cards = [
    { label: "Listing score", value: `${score}/100` },
    { label: "Left on table", value: formatRupiahMonthly(underpricingIdr) },
    { label: "Critical fixes", value: String(criticalCount) },
    { label: "Comp set", value: `${compCount} villas` },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl bg-cream px-5 py-5">
          <div className="font-mono text-[11px] uppercase tracking-wide text-pewter">
            {c.label}
          </div>
          <div className="mt-1.5 text-2xl tracking-[-0.02em] text-ink">{c.value}</div>
        </div>
      ))}
    </div>
  );
}
