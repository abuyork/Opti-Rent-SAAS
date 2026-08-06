/**
 * Display formatting helpers.
 *
 * underpricing_idr is a NIGHTLY figure (benchmark − rate). The report headline
 * ("Rp 4.8M/mo") presents it monthly, so we multiply by 30 for the "/mo" view.
 */
const NIGHTS_PER_MONTH = 30;

export function formatRupiahMonthly(nightlyIdr: number): string {
  const monthly = Math.max(0, nightlyIdr) * NIGHTS_PER_MONTH;
  return `${formatRupiahShort(monthly)}/mo`;
}

export function formatRupiahShort(idr: number): string {
  const v = Math.max(0, Math.round(idr));
  if (v >= 1_000_000) {
    const m = v / 1_000_000;
    // 1 decimal, drop trailing .0
    const s = m.toFixed(1).replace(/\.0$/, "");
    return `Rp ${s}M`;
  }
  if (v >= 1_000) return `Rp ${Math.round(v / 1_000)}k`;
  return `Rp ${v}`;
}

export function formatUsdFromCents(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

/** Compact amount in a market's native currency: "Rp 4.8M", "AED 1,506", "£382". */
export function formatMoney(currency: string, amount: number): string {
  const v = Math.max(0, Math.round(amount));
  if (currency === "IDR") return formatRupiahShort(v);
  const sym = currency === "GBP" ? "£" : `${currency} `;
  return `${sym}${v.toLocaleString("en-US")}`;
}

/**
 * Monthly view of a nightly underpricing figure, in the market's currency.
 * Headline values must fit a stat tile on ONE line (Max 2026-08-06), so from
 * 10,000 up non-IDR amounts compact to "AED 13.8K" the same way IDR already
 * compacts to "Rp 15.7M". Exact figures stay in the evidence rows.
 */
export function formatMoneyMonthly(currency: string, nightly: number): string {
  const monthly = Math.max(0, Math.round(nightly)) * NIGHTS_PER_MONTH;
  if (currency !== "IDR" && monthly >= 10_000) {
    const sym = currency === "GBP" ? "£" : `${currency} `;
    const k = (monthly / 1_000).toFixed(1).replace(/\.0$/, "");
    return `${sym}${k}K/mo`;
  }
  return `${formatMoney(currency, monthly)}/mo`;
}

/**
 * AirROI caps a search's `total_count` at 10,000 (verified 2026-07-27: Dubai
 * 1BR and London 1BR/2BR all report exactly 10000). At the cap the true
 * population is larger and unknown, so it must render as "10,000+" — printing
 * a flat "10,000" would state a number we do not have.
 */
export const TOTAL_COUNT_CAP = 10_000;

/** Whole-comp-set size for display, honest about the API's ceiling. */
export function formatCohortTotal(total: number): string {
  return total >= TOTAL_COUNT_CAP
    ? `${TOTAL_COUNT_CAP.toLocaleString("en-US")}+`
    : total.toLocaleString("en-US");
}

/**
 * Comp-set size summed across cohorts. When any cohort hit the API's 10,000
 * ceiling the sum is a floor, so round down to a clean hundred and mark it "+"
 * — a precise-looking "19,155" would claim accuracy the cap denies us.
 */
export function formatCompSetTotal(total: number, capped: boolean): string {
  return capped
    ? `${(Math.floor(total / 100) * 100).toLocaleString("en-US")}+`
    : total.toLocaleString("en-US");
}
