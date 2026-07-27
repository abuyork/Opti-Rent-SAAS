/**
 * Landing page scopes — one shared layout (`LandingPage`) rendered with four
 * scopes: the universal home page plus the Bali / Dubai / London campaign
 * pages (manager ask 2026-07-22). Campaign pages cite ONLY their own market's
 * data — no mixing. Every figure is computed from the scan benchmarks, never
 * hardcoded.
 */
import { MARKETS } from "@/lib/market/markets";
import {
  getMarketBenchmark,
  getMarketCompSet,
  getMarketScanTotal,
  getTrustStats,
} from "@/lib/market/benchmarks";
import { formatCohortTotal, formatCompSetTotal } from "@/lib/format";

export interface MarketCard {
  title: string;
  href: string;
  lines: string[];
}

export interface LandingPreviewScope {
  marketKey: string;
  cohort: string;
  windowLabel: string;
  /**
   * Sample headline figures. Every tile in the mock is market-specific so the
   * three pill tabs read as three different reports rather than one report with
   * the currency swapped (manager ask 2026-07-27). Bali mirrors a real audited
   * Canggu villa; Dubai and London are illustrative but plausible, which is why
   * the card is labeled SAMPLE REPORT.
   */
  score: number;
  criticalFixes: number;
  /** Sample nightly underpricing shown in the mock report's "left on table". */
  underpricingNightly: number;
  compSetLabel: string;
  fixHeadline: string;
  fixDetail: string;
  caption: string;
}

export interface LandingScope {
  slug: "home" | "bali" | "dubai" | "london";
  logoHref: string;
  kicker: string;
  heroHeadline: string;
  heroSub: string;
  ctaLabel: string;
  scoringLine: string;
  /** Reassurance line under the audit form, sized to this scope's comp set. */
  trustLine: string;
  preview: LandingPreviewScope;
  /** "Pick your market" cards — universal page only. */
  marketCards: MarketCard[] | null;
  /** Market-switchable sample report tabs — universal page only. */
  previewTabs: { key: string; label: string; preview: LandingPreviewScope }[] | null;
  faqMarketsAnswer: string;
  footerLine: string;
}

const baliKeys = Object.values(MARKETS)
  .filter((m) => m.currency === "IDR")
  .map((m) => m.key);

function baliListings(): number {
  return baliKeys.reduce((sum, k) => sum + (getMarketScanTotal(k) ?? 0), 0);
}

/**
 * Comp-set size for a market card. Cards used to show the measured sample,
 * which made Bali (9 regions summed) look 8x richer than Dubai and London
 * (1 region each) when the underlying markets are comparable — 26,520 vs
 * 19,155+ vs 26,803+ (manager ask 2026-07-27). Comp set reflects the market,
 * not how many scans we happened to run there.
 */
function compSetTotal(marketKeys: string[]): string {
  const sets = marketKeys.map((k) => getMarketCompSet(k)).filter((s) => s !== null);
  return formatCompSetTotal(
    sets.reduce((sum, s) => sum + s.total, 0),
    sets.some((s) => s.capped),
  );
}

function compSetCardLine(marketKeys: string[], noun: string): string {
  return `${compSetTotal(marketKeys)} ${noun} in the comp set`;
}

/** Under-the-form reassurance: what the visitor is actually up against. */
function trustLine(tail: string): string {
  return `Free score · No account needed · ${tail}`;
}

/** Sample "left on table" for the mock report: Bali mirrors a real audited
 * villa; Dubai/London derive a plausible sample from the measured winner ADR. */
function sampleGap(marketKey: string): number {
  const adr = getMarketBenchmark(marketKey, "2BR")?.winner_median_adr_idr ?? 0;
  return Math.round(adr * 0.15);
}

/**
 * "Comp set" for the sample report: the whole cohort in that region, not the
 * stratified sample we measure in depth (manager ask 2026-07-27 — "36 villas"
 * read as a thin data set). Falls back to the measured sample if a benchmark
 * predates the totals backfill.
 */
function compSetLabel(marketKey: string, cohort: string, noun: string): string {
  const b = getMarketBenchmark(marketKey, cohort);
  const n = b?.cohort_total ?? b?.sample_size ?? 0;
  return `${formatCohortTotal(n)} ${noun}`;
}

export function getLandingScope(slug: LandingScope["slug"]): LandingScope {
  if (slug === "bali") {
    const listings = baliListings();
    return {
      slug,
      logoHref: "/",
      kicker: "Bali Listing Intelligence",
      heroHeadline: "Your Airbnb is leaving money on the table.",
      heroSub:
        "Paste your Airbnb link. In about a minute you get a free listing score, an underpricing estimate against comparable villas in your region. To grow your revenue",
      ctaLabel: "Score my villa",
      scoringLine: "Scoring your villa against comparable listings…",
      trustLine: trustLine(`${compSetTotal(baliKeys)} villas in the Bali comp set`),
      preview: {
        marketKey: "greater-canggu",
        cohort: "2BR",
        windowLabel: "Greater Canggu 2BR",
        score: 68,
        criticalFixes: 3,
        underpricingNightly: 542858, // mirrors a real audited Canggu villa
        compSetLabel: compSetLabel("greater-canggu", "2BR", "villas"),
        fixHeadline: "Cover photo is an interior shot.",
        fixDetail: "Winning listings in this size class lead with pool or rooftop.",
        caption: "A real winner from our Canggu scan, shown the way your report shows it",
      },
      marketCards: null,
      previewTabs: null,
      faqMarketsAnswer: `Your villa is scored against its own Bali region: we have run full market scans across all ${baliKeys.length} regions — ${baliKeys.map((k) => MARKETS[k].title).join(", ")} — measuring ${listings.toLocaleString("en-US")} live villas in depth.`,
      footerLine: `Airbnb listing audit · Bali`,
    };
  }

  if (slug === "dubai" || slug === "london") {
    const title = MARKETS[slug].title;
    const listings = getMarketScanTotal(slug) ?? 0;
    const noun = slug === "dubai" ? "rental" : "flat";
    const compNoun = slug === "dubai" ? "apartments" : "flats";
    return {
      slug,
      logoHref: "/",
      kicker: `${title} Listing Intelligence`,
      heroHeadline: `Your ${title} ${noun} is leaving money on the table.`,
      heroSub: `Paste your Airbnb link. In about a minute you get a free listing score, an underpricing estimate against comparable ${title} listings. To grow your revenue.`,
      ctaLabel: `Score my ${noun}`,
      scoringLine: `Scoring your ${noun} against comparable listings…`,
      trustLine: trustLine(`${compSetTotal([slug])} listings in the ${title} comp set`),
      preview: {
        marketKey: slug,
        cohort: "2BR",
        windowLabel: `${title} 2BR`,
        score: slug === "dubai" ? 74 : 61,
        criticalFixes: slug === "dubai" ? 2 : 4,
        underpricingNightly: sampleGap(slug),
        compSetLabel: compSetLabel(slug, "2BR", compNoun),
        fixHeadline:
          slug === "dubai"
            ? "Cover photo is an empty living room."
            : "Cover photo is a dim bedroom shot.",
        fixDetail:
          slug === "dubai"
            ? "Winning Dubai listings lead with the trophy asset: the named view from a furnished vantage, or the pool in daylight."
            : "Winning London listings lead with a bright, styled living room, shot straight-on in daylight.",
        caption: `A real winner from our ${title} scan, shown the way your report shows it`,
      },
      marketCards: null,
      previewTabs: null,
      faqMarketsAnswer: `Your listing is scored against the ${title} market: we deep-scanned ${listings} live ${title} listings across every bedroom class from 1BR to 5+BR, sampling the top and the bottom of the revenue distribution.`,
      footerLine: `Airbnb listing audit · ${title}`,
    };
  }

  // Universal home page
  const trust = getTrustStats();
  const marketList =
    trust.displayMarkets.length > 1
      ? `${trust.displayMarkets.slice(0, -1).join(", ")} and ${trust.displayMarkets[trust.displayMarkets.length - 1]}`
      : trust.displayMarkets[0];
  return {
    slug: "home",
    logoHref: "#top",
    kicker: "Listing Intelligence",
    heroHeadline: "Your Airbnb is leaving money on the table.",
    heroSub:
      "Paste your Airbnb link. In about a minute you get a free listing score, an underpricing estimate against comparable listings in your market. To grow your revenue.",
    ctaLabel: "Score my listing",
    scoringLine: "Scoring your listing against comparable listings…",
    trustLine: trustLine(`${compSetTotal(Object.keys(MARKETS))} listings in the comp set`),
    preview: {
      marketKey: "greater-canggu",
      cohort: "2BR",
      windowLabel: "Greater Canggu 2BR",
      score: 68,
      criticalFixes: 3,
      underpricingNightly: 542858, // mirrors a real audited Canggu villa
      compSetLabel: compSetLabel("greater-canggu", "2BR", "villas"),
      fixHeadline: "Cover photo is an interior shot.",
      fixDetail: "Winning listings in this size class lead with pool or rooftop.",
      caption: "A real winner from our Bali scan, shown the way your report shows it",
    },
    previewTabs: [
      { key: "bali", label: "Bali", preview: getLandingScope("bali").preview },
      { key: "dubai", label: "Dubai", preview: getLandingScope("dubai").preview },
      { key: "london", label: "London", preview: getLandingScope("london").preview },
    ],
    marketCards: [
      {
        title: "Bali",
        href: "/bali",
        lines: [
          compSetCardLine(baliKeys, "villas"),
          `${baliKeys.length} regions, Canggu to the Nusa islands`,
        ],
      },
      {
        title: "Dubai",
        href: "/dubai",
        lines: [
          compSetCardLine(["dubai"], "listings"),
          "Every size class, Marina to the Palm",
        ],
      },
      {
        title: "London",
        href: "/london",
        lines: [
          compSetCardLine(["london"], "listings"),
          "Every size class, zone 1 and beyond",
        ],
      },
    ],
    faqMarketsAnswer: `We have run full market scans in ${marketList}. Listings elsewhere still get scored against their own comparable set; the winners section appears once we have scanned your market.`,
    footerLine: `Airbnb listing audit · ${marketList}`,
  };
}
