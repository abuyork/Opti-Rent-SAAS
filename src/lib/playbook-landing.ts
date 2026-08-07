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
import { MARKETS } from "@/lib/market/markets";

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
  /** "One-time · PDF · Bali only · 26/27 edition" */
  heroFootnote: string;
  /** Mono kicker over the proof strip: "One page of the Bali book". */
  proofLabel: string;
  /**
   * Plain sentence under the kicker naming whose numbers these are. Without it
   * the strip never says the big figures belong to the top earners — the old
   * "vs N bottom quartile" notes were carrying that alone (Max 2026-08-07).
   */
  proofLead: string;
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
const PROOF_MARKET: Record<PlaybookKey, string> = {
  bali: "greater-canggu",
  dubai: "dubai",
  london: "london",
};

/**
 * Tile notes are written to finish the sentence their tile starts ("PHOTOS /
 * 43 / the bottom 25% show 14") and to use owner words for the statistics:
 * "bottom 25%", never "bottom quartile", and no bare "winner median" — same
 * vocabulary the report enforces in `scoring/validate.ts` ANALYST_WORDS. The
 * lead line above the strip is what establishes these are the top earners'
 * figures, so the notes no longer have to. Max 2026-08-07.
 */
const photosTile = (b: MarketBenchmark): ProofTile => ({
  label: "Photos",
  value: String(Math.round(b.winner_median_photos)),
  note: `the bottom 25% show ${Math.round(b.loser_median_photos)}`,
});

const descriptionTile = (b: MarketBenchmark): ProofTile => ({
  label: "Description",
  value: Math.round(b.winner_median_description_chars).toLocaleString("en-US"),
  unit: "characters",
  // A median of 0 is real in several cohorts: over half the bottom 25%
  // came back with no description text at all. "0 characters" reads as a
  // broken number, so say what it means instead.
  note:
    Math.round(b.loser_median_description_chars) === 0
      ? "the bottom 25% write almost none"
      : `the bottom 25% write ${Math.round(b.loser_median_description_chars).toLocaleString("en-US")}`,
});

const occupancyTile = (b: MarketBenchmark): ProofTile => ({
  label: "Occupancy",
  value: `${Math.round(b.winner_median_occupancy * 100)}%`,
  note: "of their nights are booked",
});

const superhostTile = (b: MarketBenchmark): ProofTile => ({
  label: "Superhost",
  value: `${Math.round(b.winner_superhost_share * 100)}%`,
  note: "of them are Superhosts",
});

const guestFavoriteTile = (b: MarketBenchmark): ProofTile => ({
  label: "Guest Favorite",
  value: `${Math.round(b.winner_guest_favorite_share * 100)}%`,
  note: "of them are Guest Favorites",
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

/** Story step 03 quotes a real measured contrast from this region's benchmark.
 * Same plain-words rule as the proof tiles above. */
function numberClaim(key: PlaybookKey, place: string, b: MarketBenchmark | null): string {
  if (!b) {
    return `"Add more photos" is worthless. A claim with the measured top-earner and bottom-25% numbers next to it is a decision.`;
  }
  if (key === "london") {
    return `"Write a longer description" is worthless. "Top-earning London flats write ${Math.round(b.winner_median_description_chars).toLocaleString("en-US")} characters, the bottom 25% write ${Math.round(b.loser_median_description_chars).toLocaleString("en-US")}" is a decision.`;
  }
  return `"Add more photos" is worthless. "Top earners in ${place} show ${Math.round(b.winner_median_photos)} photos, the bottom 25% show ${Math.round(b.loser_median_photos)}" is a decision.`;
}

/** Where the scan reaches, in the market's own vocabulary — matches the
 * market-card lines on the home page so the site speaks one language. */
const REACH: Record<PlaybookKey, string> = {
  bali: "Canggu to the Nusa islands",
  dubai: "Marina to the Palm",
  london: "zone 1 and beyond",
};

const BUY_BLURB: Record<PlaybookKey, string> = {
  bali: "The Bali book covers Bali only - a Canggu pool shot does not win in London.",
  dubai: "The Dubai book covers Dubai only - a Marina skyline does not win in Bali.",
  london: "The London book covers London only - a bright Zone 1 living room does not win in Canggu.",
};

export function getPlaybookScope(key: PlaybookKey): PlaybookScope {
  const book = PLAYBOOKS[key];
  const compSet = playbookCompSet(book);
  const bench = getMarketBenchmark(PROOF_MARKET[key], "2BR");

  const heroSub =
    key === "bali"
      ? `We measured ${playbookMeasured(book).toLocaleString("en-US")} live Bali villas in depth - a comp set of ${compSet} across ${book.markets.length} regions - and wrote down what separates the top earners from everyone else. ${book.pages} pages, region by region and size class by size class.`
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
      body: `Inside each bedroom class we rank ${book.place} ${book.noun} on revenue, occupancy and review quality, then compare the top 25% against the bottom 25%. A tactic earns a page only if the two groups differ on it.`,
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
    heroFootnote: `One-time · PDF · ${book.place} only · ${book.edition} edition`,
    proofLabel: `One page of the ${book.place} book`,
    // "2-bedroom" tracks the "2BR" cohort the benchmark above is read from.
    proofLead: `What the top earners do · 2-bedroom ${book.noun} in ${MARKETS[PROOF_MARKET[key]].title}`,
    proofTiles: bench ? proofTiles(key, bench) : [],
    story,
    buyBlurb: BUY_BLURB[key],
    otherMarkets: PLAYBOOK_KEYS.filter((k) => k !== key).map((k) => ({
      href: `/playbook/${k}`,
      label: PLAYBOOKS[k].title,
    })),
    metaTitle: `${book.title} - what actually works in ${book.place}`,
    metaDescription: `${book.pages} pages on what the top-earning ${book.place} ${book.noun} do differently, measured against the bottom 25%: cover photos, titles, descriptions, amenities and pricing. Built from a live scan of ${compSet} ${book.noun}.`,
    footerLine: `${book.title} · built from live ${book.place} data`,
  };
}
