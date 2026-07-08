import type { ScannedListing } from "./types";

/**
 * Viral score: 0–100 percentile blend WITHIN a bedroom cohort. Raw RevPAR
 * ranking just surfaces the biggest villas (verified in probes: a global sort
 * returns 8–21BR giants), so every listing competes only against its cohort.
 *
 *   0.5 × RevPAR pctl      — revenue per available night: the outcome that matters
 *   0.3 × occupancy pctl   — demand strength at that rate
 *   0.2 × review-quality   — rating × log(review volume), the compounding signal
 *   +5 bonus (capped 100)  — Guest Favorite, the dominant 2026 badge
 */

/** Percentile rank (0..1) of each value within its array. */
function percentiles(values: number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  return values.map((v) => {
    if (sorted.length <= 1) return 0.5;
    // midpoint of the equal-value run → stable under ties
    const lo = sorted.findIndex((s) => s >= v);
    let hi = lo;
    while (hi + 1 < sorted.length && sorted[hi + 1] === v) hi++;
    return (lo + hi) / 2 / (sorted.length - 1);
  });
}

/** Mutates viral_score on every listing, cohort by cohort. */
export function scoreCohort(listings: ScannedListing[]): void {
  const pRevpar = percentiles(listings.map((l) => l.ttm_revpar));
  const pOcc = percentiles(listings.map((l) => l.ttm_occupancy));
  const pQuality = percentiles(
    listings.map((l) => (l.rating_overall ?? 0) * Math.log1p(l.num_reviews)),
  );
  listings.forEach((l, i) => {
    const blend = 0.5 * pRevpar[i] + 0.3 * pOcc[i] + 0.2 * pQuality[i];
    const bonus = l.guest_favorite ? 5 : 0;
    l.viral_score = Math.min(100, Math.round(blend * 1000) / 10 + bonus);
  });
}
