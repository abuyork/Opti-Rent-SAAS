import type { CohortStats, GroupStats, ScannedListing } from "./types";

/**
 * Deterministic winners-vs-losers contrast per cohort — the "no guessing"
 * layer. Winners = top quartile by viral score, losers = bottom quartile;
 * every delta below is a measured fact, not a model opinion.
 */

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function share(group: ScannedListing[], pred: (l: ScannedListing) => boolean): number {
  return group.length ? group.filter(pred).length / group.length : 0;
}

function groupStats(group: ScannedListing[]): GroupStats {
  return {
    n: group.length,
    median_photos: median(group.map((l) => l.photos_count)),
    median_adr: median(group.map((l) => l.ttm_avg_rate)),
    median_occupancy: median(group.map((l) => l.ttm_occupancy)),
    median_revpar: median(group.map((l) => l.ttm_revpar)),
    median_title_chars: median(group.map((l) => l.listing_name.length)),
    median_description_chars: median(group.map((l) => l.description.length)),
    median_min_nights: median(group.map((l) => l.min_nights ?? 1)),
    instant_book_share: share(group, (l) => l.instant_book === true),
    superhost_share: share(group, (l) => l.superhost),
    guest_favorite_share: share(group, (l) => l.guest_favorite),
  };
}

const TITLE_STOPWORDS = new Set([
  "a", "an", "and", "at", "by", "for", "from", "in", "of", "on", "or", "the",
  "to", "with", "w", "near", "min", "mins", "minutes", "villa", "bedroom",
  "br", "bdr", "1", "2", "3", "4", "5", "6", "1br", "2br", "3br", "4br", "5br",
]);

function titleWords(l: ScannedListing): Set<string> {
  return new Set(
    l.listing_name
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 1 && !TITLE_STOPWORDS.has(w)),
  );
}

function prevalence(group: ScannedListing[], extract: (l: ScannedListing) => Set<string>) {
  const counts = new Map<string, number>();
  for (const l of group) {
    for (const key of extract(l)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return (key: string) => (group.length ? (counts.get(key) ?? 0) / group.length : 0);
}

function contrast(
  winners: ScannedListing[],
  losers: ScannedListing[],
  extract: (l: ScannedListing) => Set<string>,
  minWinnerShare: number,
  limit: number,
) {
  const winShare = prevalence(winners, extract);
  const loseShare = prevalence(losers, extract);
  const keys = new Set(winners.flatMap((l) => [...extract(l)]));
  return [...keys]
    .map((key) => ({ key, winners: winShare(key), losers: loseShare(key) }))
    .filter((e) => e.winners >= minWinnerShare)
    .map((e) => ({ ...e, delta: e.winners - e.losers }))
    .sort((a, b) => b.delta - a.delta)
    .slice(0, limit);
}

export function cohortStats(cohort: string, listings: ScannedListing[]): CohortStats {
  const sorted = [...listings].sort((a, b) => b.viral_score - a.viral_score);
  const q = Math.max(5, Math.floor(sorted.length / 4));
  const winners = sorted.slice(0, q);
  const losers = sorted.slice(-q);

  return {
    cohort,
    sample_size: listings.length,
    winners: groupStats(winners),
    losers: groupStats(losers),
    amenity_edges: contrast(
      winners,
      losers,
      (l) => new Set(l.amenities.map((a) => a.trim().toLowerCase())),
      0.4,
      12,
    ).map(({ key, ...rest }) => ({ amenity: key, ...rest })),
    title_keywords: contrast(winners, losers, titleWords, 0.15, 12).map(
      ({ key, ...rest }) => ({ word: key, ...rest }),
    ),
  };
}

/** Winners/losers split reused by the Claude pattern pass. */
export function splitQuartiles(listings: ScannedListing[]): {
  winners: ScannedListing[];
  losers: ScannedListing[];
} {
  const sorted = [...listings].sort((a, b) => b.viral_score - a.viral_score);
  const q = Math.max(5, Math.floor(sorted.length / 4));
  return { winners: sorted.slice(0, q), losers: sorted.slice(-q) };
}
