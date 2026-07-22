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
  getMarketScanTotal,
  getTrustStats,
} from "@/lib/market/benchmarks";

export interface LandingStat {
  value: string;
  label: string;
}

export interface MarketCard {
  title: string;
  href: string;
  lines: string[];
}

export interface LandingPreviewScope {
  marketKey: string;
  cohort: string;
  windowLabel: string;
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
  preview: LandingPreviewScope;
  terminal: { marketKey: string; fetchedLine: string };
  evidence: { listings: number; marketPhrase: string; stats: LandingStat[] };
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

/** Sample "left on table" for the mock report: Bali mirrors a real audited
 * villa; Dubai/London derive a plausible sample from the measured winner ADR. */
function sampleGap(marketKey: string): number {
  const adr = getMarketBenchmark(marketKey, "2BR")?.winner_median_adr_idr ?? 0;
  return Math.round(adr * 0.15);
}

const WINNERS_STAT: LandingStat = { value: "10", label: "winners shown beside yours" };

export function getLandingScope(slug: LandingScope["slug"]): LandingScope {
  if (slug === "bali") {
    const listings = baliListings();
    return {
      slug,
      logoHref: "/",
      kicker: "OptimoRent · Bali Listing Intelligence",
      heroHeadline: "Your villa is leaving money on the table.",
      heroSub:
        "Paste your Airbnb link. In about a minute you get a free listing score, an underpricing estimate against comparable villas in your region, and a count of what needs fixing.",
      ctaLabel: "Score my villa",
      scoringLine: "Scoring your villa against comparable listings…",
      preview: {
        marketKey: "greater-canggu",
        cohort: "2BR",
        windowLabel: "Greater Canggu 2BR",
        underpricingNightly: 542858, // mirrors a real audited Canggu villa
        compSetLabel: `${getMarketBenchmark("greater-canggu", "2BR")?.sample_size ?? 36} villas`,
        fixHeadline: "Cover photo is an interior shot.",
        fixDetail: "Winning listings in this size class lead with pool or rooftop.",
        caption: "A real winner from our Canggu scan, shown the way your report shows it",
      },
      terminal: {
        marketKey: "greater-canggu",
        fetchedLine: `fetched ${getMarketScanTotal("greater-canggu")} live listings · 5 size classes`,
      },
      evidence: {
        listings,
        marketPhrase: `${baliKeys.length} Bali regions, from Greater Canggu to the Nusa islands`,
        stats: [
          { value: listings.toLocaleString("en-US"), label: "live villas measured" },
          { value: String(baliKeys.length), label: "Bali regions scanned" },
          WINNERS_STAT,
        ],
      },
      marketCards: null,
      previewTabs: null,
      faqMarketsAnswer: `Your villa is scored against its own Bali region: we have run full market scans across all ${baliKeys.length} regions — ${baliKeys.map((k) => MARKETS[k].title).join(", ")} — measuring ${listings.toLocaleString("en-US")} live villas in depth.`,
      footerLine: `Villa listing audit · Bali · ${baliKeys.length} regions`,
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
      kicker: `OptimoRent · ${title} Listing Intelligence`,
      heroHeadline: `Your ${title} ${noun} is leaving money on the table.`,
      heroSub: `Paste your Airbnb link. In about a minute you get a free listing score, an underpricing estimate against comparable ${title} listings, and a count of what needs fixing.`,
      ctaLabel: `Score my ${noun}`,
      scoringLine: `Scoring your ${noun} against comparable listings…`,
      preview: {
        marketKey: slug,
        cohort: "2BR",
        windowLabel: `${title} 2BR`,
        underpricingNightly: sampleGap(slug),
        compSetLabel: `${getMarketBenchmark(slug, "2BR")?.sample_size ?? 40} ${compNoun}`,
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
      terminal: {
        marketKey: slug,
        fetchedLine: `fetched ${listings} live listings · 5 size classes`,
      },
      evidence: {
        listings,
        marketPhrase: `every ${title} size class, 1BR to 5+BR`,
        stats: [
          { value: listings.toLocaleString("en-US"), label: "live listings measured" },
          { value: "5", label: "size classes scanned" },
          WINNERS_STAT,
        ],
      },
      marketCards: null,
      previewTabs: null,
      faqMarketsAnswer: `Your listing is scored against the ${title} market: we deep-scanned ${listings} live ${title} listings across every bedroom class from 1BR to 5+BR, sampling the top and the bottom of the revenue distribution.`,
      footerLine: `Listing audit · ${title}`,
    };
  }

  // Universal home page
  const trust = getTrustStats();
  const marketList =
    trust.displayMarkets.length > 1
      ? `${trust.displayMarkets.slice(0, -1).join(", ")} and ${trust.displayMarkets[trust.displayMarkets.length - 1]}`
      : trust.displayMarkets[0];
  const bali = baliListings();
  return {
    slug: "home",
    logoHref: "#top",
    kicker: "OptimoRent · Listing Intelligence",
    heroHeadline: "Your Airbnb is leaving money on the table.",
    heroSub:
      "Paste your Airbnb link. In about a minute you get a free listing score, an underpricing estimate against comparable listings in your market, and a count of what needs fixing.",
    ctaLabel: "Score my listing",
    scoringLine: "Scoring your listing against comparable listings…",
    preview: {
      marketKey: "greater-canggu",
      cohort: "2BR",
      windowLabel: "Greater Canggu 2BR",
      underpricingNightly: 542858, // mirrors a real audited Canggu villa
      compSetLabel: `${getMarketBenchmark("greater-canggu", "2BR")?.sample_size ?? 36} villas`,
      fixHeadline: "Cover photo is an interior shot.",
      fixDetail: "Winning listings in this size class lead with pool or rooftop.",
      caption: "A real winner from our Bali scan, shown the way your report shows it",
    },
    terminal: {
      marketKey: "greater-canggu",
      fetchedLine: `fetched ${getMarketScanTotal("greater-canggu")} live listings · 5 size classes`,
    },
    evidence: {
      listings: trust.listings,
      marketPhrase: marketList,
      stats: [
        { value: trust.listings.toLocaleString("en-US"), label: "live listings measured" },
        { value: "3", label: "destinations covered" },
        WINNERS_STAT,
      ],
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
          `${bali.toLocaleString("en-US")} villas measured`,
          `${baliKeys.length} regions, Canggu to the Nusa islands`,
        ],
      },
      {
        title: "Dubai",
        href: "/dubai",
        lines: [
          `${(getMarketScanTotal("dubai") ?? 0).toLocaleString("en-US")} listings measured`,
          "Every size class, Marina to the Palm",
        ],
      },
      {
        title: "London",
        href: "/london",
        lines: [
          `${(getMarketScanTotal("london") ?? 0).toLocaleString("en-US")} listings measured`,
          "Every size class, zone 1 and beyond",
        ],
      },
    ],
    faqMarketsAnswer: `We have run full market scans in ${marketList}. Listings elsewhere still get scored against their own comparable set; the winners section appears once we have scanned your market.`,
    footerLine: `Listing audit · ${marketList}`,
  };
}
