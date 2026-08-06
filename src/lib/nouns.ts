/**
 * What a market's listings are called, keyed by the market's currency —
 * the one signal every audit row carries. Bali sells villas, Dubai rentals,
 * London flats; universal surfaces say "listings". Shared so the report and
 * stat tiles can't drift from the landing pages again (pre-launch QA
 * 2026-08-06: the report's noun split only ever implemented Bali).
 */
export function marketNoun(currency: string | null | undefined): string {
  switch (currency) {
    case "IDR":
      return "villas";
    case "AED":
      return "rentals";
    case "GBP":
      return "flats";
    default:
      return "listings";
  }
}
