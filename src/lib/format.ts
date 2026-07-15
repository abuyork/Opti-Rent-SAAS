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
