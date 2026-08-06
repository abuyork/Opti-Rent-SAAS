/**
 * Playbook catalog — the three branded market PDFs sold on /playbook.
 *
 * Built from `docs/playbook-src` (see its README). Every figure here is
 * computed from the same scan benchmarks the site and the PDFs use, so a
 * re-scan moves the page and the book together and they can never disagree.
 * Page counts are the one hand-maintained number: they come from the rendered
 * PDF, so update them when a book is rebuilt.
 */
import { MARKETS } from "@/lib/market/markets";
import { getMarketCompSet, getMarketScanTotal } from "@/lib/market/benchmarks";
import { formatCompSetTotal } from "@/lib/format";

export type PlaybookKey = "bali" | "dubai" | "london";

export interface PlaybookDef {
  key: PlaybookKey;
  title: string;
  /** Object of the sentence: "…every 2BR in **Bali**". */
  place: string;
  /** What the listings are called in this market. */
  noun: string;
  /** Storage object name in the private `playbooks` bucket. */
  file: string;
  pages: number;
  /** Market keys whose scans feed this book. */
  markets: string[];
  /** How the book is chaptered, e.g. "9 regions" or "5 size classes". */
  chapterLine: string;
  /** Edition stamp matching the PDF cover ("August 2026"); the scans behind it ran July 2026. */
  edition: string;
}

const BALI_MARKETS = Object.values(MARKETS)
  .filter((m) => m.currency === "IDR")
  .map((m) => m.key);

export const PLAYBOOKS: Record<PlaybookKey, PlaybookDef> = {
  bali: {
    key: "bali",
    title: "The Bali Playbook",
    place: "Bali",
    noun: "villas",
    file: "The-Bali-Playbook.pdf",
    pages: 28,
    markets: BALI_MARKETS,
    chapterLine: `${BALI_MARKETS.length} regions, Canggu to the Nusa islands`,
    edition: "August 2026",
  },
  dubai: {
    key: "dubai",
    title: "The Dubai Playbook",
    place: "Dubai",
    noun: "rentals",
    file: "The-Dubai-Playbook.pdf",
    pages: 20,
    markets: ["dubai"],
    chapterLine: "5 size classes, 1BR to 5+BR",
    edition: "August 2026",
  },
  london: {
    key: "london",
    title: "The London Playbook",
    place: "London",
    noun: "flats",
    file: "The-London-Playbook.pdf",
    pages: 21,
    markets: ["london"],
    chapterLine: "5 size classes, 1BR to 5+BR",
    edition: "August 2026",
  },
};

export const PLAYBOOK_KEYS = Object.keys(PLAYBOOKS) as PlaybookKey[];

export function isPlaybookKey(v: string): v is PlaybookKey {
  return v in PLAYBOOKS;
}

/** Whole comp set behind a book, formatted ("26,520", "19,100+"). */
export function playbookCompSet(p: PlaybookDef): string {
  const sets = p.markets.map((k) => getMarketCompSet(k)).filter((s) => s !== null);
  return formatCompSetTotal(
    sets.reduce((sum, s) => sum + s.total, 0),
    sets.some((s) => s.capped),
  );
}

/** Listings actually deep-scanned for the book — always smaller than the comp set. */
export function playbookMeasured(p: PlaybookDef): number {
  return p.markets.reduce((sum, k) => sum + (getMarketScanTotal(k) ?? 0), 0);
}

/**
 * Deep-scanned total across all three books, rounded to the nearest thousand
 * with a "+". Alex's call 2026-07-29: the exact figure moves every time we scan
 * (Dubai and London are queued for deeper samples), and a round number does not
 * go stale between scans.
 */
export function measuredTotalLabel(): string {
  const total = PLAYBOOK_KEYS.reduce((sum, k) => sum + playbookMeasured(PLAYBOOKS[k]), 0);
  return `${(Math.round(total / 1000) * 1000).toLocaleString("en-US")}+`;
}

/**
 * What every book contains, in the order the chapters appear. Mirrors the
 * section structure of `docs/playbooks/<market>-*.md`, which is what the PDF
 * is rendered from — so this list is a description, not a promise.
 */
export const PLAYBOOK_CONTENTS: { title: string; body: string }[] = [
  {
    title: "Top actions, highest leverage first",
    body: "What moves revenue in this market, ranked, starting with the biggest gap.",
  },
  {
    title: "Cover photos",
    body: "What top earners lead with, what the bottom quartile shows instead, both named.",
  },
  {
    title: "Titles",
    body: "The words that carry measured positive delta per size class, and the ones worth zero.",
  },
  {
    title: "Descriptions",
    body: "How long winning descriptions run and what their opening two sentences do.",
  },
  {
    title: "Amenities",
    body: "What over-indexes in winners. Untagged is unbookable, so the list matters.",
  },
  {
    title: "Pricing",
    body: "Where winners sit on nightly rate and occupancy, per size class.",
  },
  {
    title: "Winners versus losers, per size class",
    body: "Photos, description length, occupancy, Superhost share: top quartile against bottom.",
  },
  {
    title: "The top 10 listings in each size class",
    body: "Real listings, cover shots, revenue per available night and occupancy.",
  },
];
