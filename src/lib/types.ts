/**
 * Core domain types for OptiRent.
 *
 * The `ScoringResult` shape is the strict-JSON contract returned by the Claude
 * scoring engine (Build Pack §6). The `ListingInput` / `CompsInput` shapes are
 * the `listing` and `comps` objects we send to Claude as the user message.
 *
 * Keep these in sync with the system prompt in `src/lib/scoring/prompt.ts`.
 */

// ---------------------------------------------------------------------------
// Scoring categories & weights (Build Pack §6 "Method")
// ---------------------------------------------------------------------------

export const CATEGORY_WEIGHTS = {
  photos: 0.25,
  pricing_position: 0.2,
  title: 0.15,
  description: 0.15,
  amenity_gap: 0.1,
  reviews: 0.1,
  risk_rules: 0.05,
} as const;

export type CategoryKey = keyof typeof CATEGORY_WEIGHTS;

export interface CategoryScores {
  photos: number;
  title: number;
  pricing_position: number;
  description: number;
  amenity_gap: number;
  reviews: number;
  risk_rules: number;
}

// ---------------------------------------------------------------------------
// Fixes & rewrites
// ---------------------------------------------------------------------------

export type Severity = "critical" | "high" | "medium";

export interface Fix {
  severity: Severity;
  /** Short imperative title, e.g. "Replace hero photo". */
  title: string;
  /** What & why. */
  detail: string;
  /** Must cite a comp basis or listing fact, e.g. "comps avg 26, this 14". */
  comp_basis: string;
}

export interface Rewrite {
  before: string;
  after: string;
}

export interface Rewrites {
  title: Rewrite;
  description_opening: Rewrite;
}

// ---------------------------------------------------------------------------
// The strict-JSON scoring result (Build Pack §6 "OUTPUT")
// ---------------------------------------------------------------------------

export interface ScoringResult {
  overall_score: number;
  category_scores: CategoryScores;
  /** Benchmark ESTIMATE of nightly underpricing in IDR (>= 0). Never a guarantee. */
  underpricing_idr: number;
  comp_count: number;
  /** e.g. "23 Berawa 3BR pool villas". */
  comp_basis: string;
  problem_count: number;
  critical_count: number;
  fixes: Fix[];
  rewrites: Rewrites;
}

// ---------------------------------------------------------------------------
// Inputs to the scoring engine (the user-message JSON)
// ---------------------------------------------------------------------------

export interface ReviewSummary {
  count: number;
  /** Overall rating 0–5 (or null if no reviews yet). */
  rating: number | null;
  /** Representative recent review snippets the model can scan for recurring themes. */
  recent: string[];
}

export interface ListingInput {
  title: string;
  description: string;
  /** Ordered photo references (URLs or short captions). Order matters for the hero. */
  photos: string[];
  amenities: string[];
  reviews: ReviewSummary;
  beds: number;
  baths: number;
  /** Sub-area, e.g. "Berawa". */
  area: string;
  pool: boolean;
  /** Listing's own nightly rate in IDR. */
  nightly_rate: number;
}

export interface CompsInput {
  comp_count: number;
  area: string;
  bed_count: number;
  avg_photo_count: number;
  /** Benchmark nightly rate in IDR derived from the comp set. Drives the pricing band. */
  benchmark_nightly_rate: number;
  common_amenities: string[];
  /** Qualitative pool tier across comps, e.g. "most have private pools". */
  pool_tier: string;
}

export interface ScoringInput {
  listing: ListingInput;
  comps: CompsInput;
}

// ---------------------------------------------------------------------------
// AirROI provider contract (resolved listing + comps before scoring)
// ---------------------------------------------------------------------------

export interface ResolvedListing {
  airroi_listing_id: string;
  airbnb_url: string;
  listing: ListingInput;
  comps: CompsInput;
  /** True when content (description/photos) came from a fallback scrape, not AirROI. */
  content_fallback?: boolean;
}

// ---------------------------------------------------------------------------
// Persisted audit (mirrors the `audits` table, Build Pack §5)
// ---------------------------------------------------------------------------

export interface Audit {
  id: string;
  airbnb_url: string;
  airroi_listing_id: string | null;
  email: string;
  created_at: string;
  overall_score: number;
  category_scores: CategoryScores;
  underpricing_idr: number;
  comp_count: number;
  comp_basis: string;
  problem_count: number;
  critical_count: number;
  fixes: Fix[];
  rewrites: Rewrites;
  paid: boolean;
}

/** What the FREE tier exposes (no fixes/rewrites). Build Pack §1, §4 step 6. */
export interface FreeAuditView {
  id: string;
  overall_score: number;
  underpricing_idr: number;
  comp_count: number;
  comp_basis: string;
  problem_count: number;
  critical_count: number;
  paid: boolean;
}
