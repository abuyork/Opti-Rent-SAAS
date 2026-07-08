import type { ScoringInput, ScoringResult } from "@/lib/types";

/**
 * Deterministic grounding check: every number the model cites in a fix must
 * correspond to a fact in the scoring input (or a value derivable from it).
 * Catches fabricated counts/prices/ratings instantly, with no human review —
 * the first layer of the automated pressure-test (Manager feedback 2026-07).
 */

export interface GroundingIssue {
  /** Index into result.fixes, or -1 for result-level fields. */
  fix_index: number;
  location: string;
  /** The numeric token that matched nothing in the input. */
  claim: string;
  context: string;
  /**
   * "error" for comp_basis (a factual citation by contract); "warn" for detail,
   * where advice legitimately contains target numbers ("aim for 30+ photos").
   */
  severity: "error" | "warn";
}

/** Facts + derived values a fix is allowed to cite. */
function truthValues(input: ScoringInput): number[] {
  const l = input.listing;
  const c = input.comps;
  const underpricing = Math.max(0, c.benchmark_nightly_rate - l.nightly_rate);
  const gapPct = c.benchmark_nightly_rate
    ? ((c.benchmark_nightly_rate - l.nightly_rate) / c.benchmark_nightly_rate) * 100
    : 0;

  const base = [
    l.photos.length,
    l.photos_count ?? 0,
    l.beds,
    l.baths,
    l.nightly_rate,
    l.reviews.count,
    l.reviews.rating ?? 0,
    l.reviews.cleanliness ?? 0,
    l.reviews.location ?? 0,
    l.min_nights ?? 0,
    l.amenities.length,
    c.comp_count,
    c.avg_photo_count,
    c.benchmark_nightly_rate,
    c.common_amenities.length,
    underpricing,
    underpricing * 30, // monthly figure used in "left on table"
    gapPct,
    // photo-count gap, the most-cited delta
    Math.abs(c.avg_photo_count - (l.photos_count ?? l.photos.length)),
  ].filter((n) => Number.isFinite(n));

  // Million-scale variants of the money figures (reports write "Rp 3.7M").
  const millions = [underpricing, underpricing * 30, l.nightly_rate, c.benchmark_nightly_rate]
    .filter((n) => n > 0)
    .map((n) => n / 1_000_000);

  return [...base, ...millions];
}

/** Pull numeric tokens out of prose; strips thousand separators ("2,137,752"). */
function extractNumbers(text: string): { value: number; token: string }[] {
  const out: { value: number; token: string }[] = [];
  for (const m of text.matchAll(/\d[\d,]*(?:\.\d+)?/g)) {
    const token = m[0];
    const value = Number(token.replace(/,/g, ""));
    if (Number.isFinite(value)) out.push({ value, token });
  }
  return out;
}

function isSupported(n: number, truths: number[]): boolean {
  // Rounding slack: exact for small values, ~1.5% for large ones (rates get
  // rounded to "2.1M" style figures in prose).
  return truths.some((t) => Math.abs(n - t) <= Math.max(0.6, 0.015 * Math.abs(t)));
}

/**
 * Numbers below this are ignored: tiny integers ("image 1", "2 bedrooms",
 * "add 10-12 photos" recommendations) drown the signal in false positives.
 * Decimals (ratings like 4.75) are always checked.
 */
const MIN_CHECKED_INT = 13;

function checkText(
  text: string,
  truths: number[],
  fixIndex: number,
  location: string,
  severity: GroundingIssue["severity"],
  issues: GroundingIssue[],
): void {
  for (const { value, token } of extractNumbers(text)) {
    const isDecimal = token.includes(".");
    if (!isDecimal && value < MIN_CHECKED_INT) continue;
    if (!isDecimal && value >= 2020 && value <= 2030) continue; // years
    if (isSupported(value, truths)) continue;
    issues.push({
      fix_index: fixIndex,
      location,
      claim: token,
      context: text.length > 140 ? `${text.slice(0, 140)}…` : text,
      severity,
    });
  }
}

/** Check every fix (and the top-level comp_basis) for ungrounded numbers. */
export function checkGrounding(
  input: ScoringInput,
  result: ScoringResult,
): GroundingIssue[] {
  const truths = truthValues(input);
  const issues: GroundingIssue[] = [];

  checkText(result.comp_basis, truths, -1, "comp_basis", "error", issues);
  result.fixes.forEach((fix, i) => {
    checkText(fix.detail, truths, i, `fixes[${i}].detail`, "warn", issues);
    checkText(fix.comp_basis, truths, i, `fixes[${i}].comp_basis`, "error", issues);
  });
  return issues;
}
