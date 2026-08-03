/**
 * Per-region playbook landing scopes — one shared layout
 * (`PlaybookRegionPage`) rendered once per book: /playbook/bali, /playbook/dubai,
 * /playbook/london (Max ask 2026-08-03: each page speaks only about its own
 * region; /playbook itself is the picker hub). Every figure is computed from
 * the scan benchmarks and the playbook catalog, never hardcoded.
 *
 * Numbers framing follows the comp-set decision (2026-07-27): region heroes
 * lead with the comp set (26,520 / 19,100+ / 26,800+ — comparable markets),
 * not the measured sample (1,581 / 200 / 200 — which makes Dubai and London
 * look thin when the underlying markets are not).
 */
import {
  PLAYBOOKS,
  PLAYBOOK_KEYS,
  playbookCompSet,
  playbookMeasured,
  type PlaybookDef,
  type PlaybookKey,
} from "@/lib/playbooks";
import { getMarketBenchmark, type MarketBenchmark } from "@/lib/market/benchmarks";

export interface ProofTile {
  label: string;
  value: string;
  unit?: string;
  note: string;
}

export interface PlaybookScope {
  book: PlaybookDef;
  kicker: string;
  heroHeadline: string;
  heroSub: string;
  /** "One-time · PDF · Bali only · scanned July 2026" */
  heroFootnote: string;
  /** "One page of the Bali book · Greater Canggu, 2 bedrooms" */
  proofLabel: string;
  /** Empty when the market's benchmark is missing — section is hidden then. */
  proofTiles: ProofTile[];
  story: { n: string; title: string; body: string }[];
  buyBlurb: string;
  /** The other two books, for the "not your market?" line. */
  otherMarkets: { href: string; label: string }[];
  metaTitle: string;
  metaDescription: string;
  footerLine: string;
}

/** Which market's benchmark supplies a book's proof strip. Bali's book spans 9
 * regions, so it quotes its flagship region; Dubai and London are their own. */
const PROOF: Record<PlaybookKey, { market: string; label: string }> = {
  bali: { market: "greater-canggu", label: "One page of the Bali book · Greater Canggu, 2 bedrooms" },
  dubai: { market: "dubai", label: "One page of the Dubai book · 2 bedrooms" },
  london: { market: "london", label: "One page of the London book · 2 bedrooms" },
};

const photosTile = (b: MarketBenchmark): ProofTile => ({
  label: "Photos",
  value: String(Math.round(b.winner_median_photos)),
  note: `vs ${Math.round(b.loser_median_photos)} bottom quartile`,
});

const descriptionTile = (b: MarketBenchmark): ProofTile => ({
  label: "Description",
  value: Math.round(b.winner_median_description_chars).toLocaleString("en-US"),
  unit: "chars",
  note: `vs ${Math.round(b.loser_median_description_chars).toLocaleString("en-US")} bottom quartile`,
});

const occupancyTile = (b: MarketBenchmark): ProofTile => ({
  label: "Occupancy",
  value: `${Math.round(b.winner_median_occupancy * 100)}%`,
  note: "winner median",
});

const superhostTile = (b: MarketBenchmark): ProofTile => ({
  label: "Superhost",
  value: `${Math.round(b.winner_superhost_share * 100)}%`,
  note: "of winners",
});

const guestFavoriteTile = (b: MarketBenchmark): ProofTile => ({
  label: "Guest favorite",
  value: `${Math.round(b.winner_guest_favorite_share * 100)}%`,
  note: "of winners",
});

/**
 * Four tiles per region, picked where the measured contrast is actually strong.
 * London's photo gap is 23 vs 21 — quoting it would argue against the book —
 * so London leads with description length and guest-favorite share instead.
 */
function proofTiles(key: PlaybookKey, b: MarketBenchmark): ProofTile[] {
  if (key === "london") {
    return [descriptionTile(b), guestFavoriteTile(b), occupancyTile(b), superhostTile(b)];
  }
  return [photosTile(b), descriptionTile(b), occupancyTile(b), superhostTile(b)];
}

/** Story step 03 quotes a real measured contrast from this region's benchmark. */
function numberClaim(key: PlaybookKey, place: string, b: MarketBenchmark | null): string {
  if (!b) {
    return `"Add more photos" is worthless. A claim with the measured winner and loser numbers next to it is a decision.`;
  }
  if (key === "london") {
    return `"Write a longer description" is worthless. "Winning London descriptions run ${Math.round(b.winner_median_description_chars).toLocaleString("en-US")} characters, the bottom quartile runs ${Math.round(b.loser_median_description_chars).toLocaleString("en-US")}" is a decision.`;
  }
  return `"Add more photos" is worthless. "Winners in ${place} run ${Math.round(b.winner_median_photos)} photos, the bottom quartile runs ${Math.round(b.loser_median_photos)}" is a decision.`;
}

/** Where the scan reaches, in the market's own vocabulary — matches the
 * market-card lines on the home page so the site speaks one language. */
const REACH: Record<PlaybookKey, string> = {
  bali: "Canggu to the Nusa islands",
  dubai: "Marina to the Palm",
  london: "zone 1 and beyond",
};

const BUY_BLURB: Record<PlaybookKey, string> = {
  bali: "The Bali book covers Bali only — a Canggu pool shot does not win in London.",
  dubai: "The Dubai book covers Dubai only — a Marina skyline does not win in Bali.",
  london: "The London book covers London only — a bright zone-1 living room does not win in Canggu.",
};

export function getPlaybookScope(key: PlaybookKey): PlaybookScope {
  const book = PLAYBOOKS[key];
  const compSet = playbookCompSet(book);
  const bench = getMarketBenchmark(PROOF[key].market, "2BR");

  const heroSub =
    key === "bali"
      ? `We measured ${playbookMeasured(book).toLocaleString("en-US")} live Bali villas in depth — a comp set of ${compSet} across ${book.markets.length} regions — and wrote down what separates the top earners from everyone else. ${book.pages} pages, region by region and size class by size class.`
      : `We benchmarked a comp set of ${compSet} live ${book.place} ${book.noun} and measured the top and the bottom of the revenue distribution in depth. ${book.pages} pages on what the top earners do differently, size class by size class.`;

  const story = [
    {
      n: "01",
      title: `We scan ${book.place}, not the internet`,
      body: `A live pull of active ${book.noun} across ${book.place}, ${REACH[key]}: photos, titles, descriptions, amenities, rate, occupancy and trailing revenue. Not blog advice.`,
    },
    {
      n: "02",
      title: "We split winners from laggards",
      body: `Inside each bedroom class we rank ${book.place} ${book.noun} on revenue, occupancy and review quality, then compare top quartile against bottom. A tactic earns a page only if the two groups differ on it.`,
    },
    {
      n: "03",
      title: "Every claim carries its number",
      body: numberClaim(key, book.place, bench),
    },
  ];

  return {
    book,
    kicker: book.title,
    heroHeadline: `Stop guessing what works in ${book.place}.`,
    heroSub,
    heroFootnote: `One-time · PDF · ${book.place} only · scanned ${book.scanned}`,
    proofLabel: PROOF[key].label,
    proofTiles: bench ? proofTiles(key, bench) : [],
    story,
    buyBlurb: BUY_BLURB[key],
    otherMarkets: PLAYBOOK_KEYS.filter((k) => k !== key).map((k) => ({
      href: `/playbook/${k}`,
      label: PLAYBOOKS[k].place,
    })),
    metaTitle: `${book.title} - what actually works in ${book.place}`,
    metaDescription: `${book.pages} pages on what the top-earning ${book.place} ${book.noun} do differently, measured against the bottom quartile: cover photos, titles, descriptions, amenities and pricing. Built from a live scan of ${compSet} ${book.noun}.`,
    footerLine: `${book.title} · built from live ${book.place} data`,
  };
}
