import { formatCohortTotal, formatMoney, formatMoneyMonthly } from "@/lib/format";
import { marketNoun } from "@/lib/nouns";

/**
 * The underpricing figure is measured against the NEARBY comps (the closest
 * 25, the whole quality spectrum), while the fix list is grounded in the
 * cohort's top earners — so a listing can be at zero here and still carry a
 * "winners charge more" pricing fix. Max caught the two reading as a
 * contradiction (2026-08-07): the zero state must scope its claim to the
 * nearby comps, and when the winner rate is meaningfully above the listing's
 * own rate, say so in the same breath the fix list will.
 */
const WINNER_GAP_MIN_RATIO = 1.2;

function leftOnTableNote(
  currency: string,
  nightlyRate: number | null,
  winnerNightlyRate: number | null,
): string {
  const scoped = "at the nearby comp rate";
  if (!nightlyRate || !winnerNightlyRate) return scoped;
  if (winnerNightlyRate < nightlyRate * WINNER_GAP_MIN_RATIO) return scoped;
  return `${scoped} · winners charge about ${formatMoney(currency, winnerNightlyRate)} a night`;
}

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
  marketCohortTotal = null,
  cohortLabel = null,
  nightlyRate = null,
  winnerNightlyRate = null,
}: {
  score: number;
  underpricingIdr: number;
  criticalCount: number;
  compCount: number;
  currency?: string;
  marketCohortSize?: number | null;
  /** Whole comp set in the market + size class (search total_count). */
  marketCohortTotal?: number | null;
  /** e.g. "3BR", for the note under the comp-set card. */
  cohortLabel?: string | null;
  /** The listing's own nightly rate; absent on pre-2026-08-07 audits. */
  nightlyRate?: number | null;
  /** Winner median nightly rate for the cohort, from market evidence. */
  winnerNightlyRate?: number | null;
}) {
  const noun = marketNoun(currency);
  const measured = compCount + (marketCohortSize ?? 0);
  const cards = [
    { label: "Listing score", value: `${score}/100`, note: null },
    underpricingIdr > 0
      ? {
          label: "Left on table",
          value: formatMoneyMonthly(currency, underpricingIdr),
          note: "vs the typical nearby comp",
        }
      : {
          label: "Left on table",
          value: "None",
          note: leftOnTableNote(currency, nightlyRate, winnerNightlyRate),
        },
    { label: "Critical fixes", value: String(criticalCount), note: null },
    // The comp set is the whole cohort in this market (manager ask 2026-07-27);
    // the note keeps it honest about how many of those we measure in depth.
    marketCohortTotal
      ? {
          label: "Comp set",
          value: `${formatCohortTotal(marketCohortTotal)} ${noun}`,
          note: `${cohortLabel ? `${cohortLabel} in your market` : "in your size class"} · ${measured} measured in depth`,
        }
      : marketCohortSize
        ? {
            label: "Compared against",
            value: `${measured} ${noun}`,
            note: `${compCount} nearby · ${marketCohortSize} in your size class`,
          }
        : {
            label: "Compared against",
            value: `${compCount} ${noun}`,
            note: "closest comparables",
          },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl bg-cream px-5 py-5">
          <div className="font-mono text-[11px] uppercase tracking-[0.15em] text-pewter">
            {c.label}
          </div>
          {/* text-xl + nowrap: every value measured to fit the narrowest tile
              on one line (Max 2026-08-06: "Rp 15.7M/mo" was wrapping). */}
          <div className="mt-1.5 whitespace-nowrap text-xl tracking-[-0.02em] text-ink">
            {c.value}
          </div>
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
