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
        <div key={c.label} className="rounded-lg bg-brand-card px-4 py-4">
          <div className="text-xs font-medium uppercase tracking-wide text-brand-muted">
            {c.label}
          </div>
          <div className="mt-1 text-xl font-bold text-brand-navy">{c.value}</div>
        </div>
      ))}
    </div>
  );
}
