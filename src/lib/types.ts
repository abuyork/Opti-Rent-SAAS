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

/** One paste-ready title option, e.g. { tone: "design-led", text: "..." }. */
export interface TitleVariant {
  tone: string;
  text: string;
}

export interface Rewrites {
  /** Kept as the single strongest option (backward compatible with old audits). */
  title: Rewrite;
  /** Three tone variants; absent on audits scored before this feature. */
  title_variants?: TitleVariant[];
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
  /** Cleanliness sub-score 0–5 — Airbnb filters/sorts on this explicitly (v2). */
  cleanliness?: number | null;
  /** Location sub-score 0–5 — a low value can signal a false-proximity title claim. */
  location?: number | null;
}

export interface ListingInput {
  title: string;
  description: string;
  /** Ordered photo references (URLs or short captions). Order matters for the hero. */
  photos: string[];
  /**
   * True when photos[0] is the listing's real Airbnb cover (verified via the
   * page's og:image). Provider photo order can differ from display order, so
   * cover-specific claims are only allowed when this is true.
   */
  cover_verified?: boolean;
  /** Total photo count (may exceed the returned `photos` array). */
  photos_count?: number;
  amenities: string[];
  reviews: ReviewSummary;
  beds: number;
  baths: number;
  /** Sub-area, e.g. "Berawa". */
  area: string;
  pool: boolean;
  /** Listing's own nightly rate in IDR. */
  nightly_rate: number;
  // --- v2 conversion/operational signals (from AirROI booking_settings/host_info) ---
  /** Instant Book on? Materially lifts ranking (v2). null = unknown. */
  instant_book?: boolean | null;
  min_nights?: number | null;
  cancellation_policy?: string;
  superhost?: boolean;
  /** Guest Favorite badge — the dominant 2026 quality signal (v2). */
  guest_favorite?: boolean;
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
  /** Qualitative quality tier of the comp set, e.g. "many are Guest Favorites". */
  quality_tier?: string;
  /** Representative comp titles — lets the model position rewrites against what neighbours already say. */
  sample_titles?: string[];
}

/** A real winning listing shown in the report as a visual reference. */
export interface MarketCoverExample {
  listing_name: string;
  viral_score: number;
  cover_photo_url: string;
  locality: string;
  ttm_revpar: number;
  ttm_occupancy: number;
}

/**
 * Measured market evidence for a listing's Greater-Canggu bedroom cohort,
 * distilled from the scan (top-quartile winners vs bottom-quartile losers).
 * Fed to the scorer so fixes cite proof, and stored on the audit so the report
 * can show the same numbers + winner cover examples.
 */
export interface AuditMarketEvidence {
  market: string;
  cohort: string;
  sample_size: number;
  winner_median_photos: number;
  loser_median_photos: number;
  winner_median_title_chars: number;
  winner_median_description_chars: number;
  loser_median_description_chars: number;
  winner_median_adr_idr: number;
  winner_median_occupancy: number;
  winner_superhost_share: number;
  winner_guest_favorite_share: number;
  /** Amenities that over-index in winners (winner share vs loser share). */
  top_amenities: { amenity: string; winner_share: number; loser_share: number }[];
  /** Title words that over-index in winners. */
  title_keywords: string[];
  /** Real winning covers to display as visual references. */
  winner_covers: MarketCoverExample[];
}

export interface ScoringInput {
  listing: ListingInput;
  comps: CompsInput;
  /** Bali micro-market segment, e.g. "Canggu/Berawa" (drives segment-match scoring, v2). */
  micro_market?: string;
  /** Inferred target guest, e.g. "remote workers / long-stay" (v2). */
  target_guest?: string;
  /** Measured winner benchmarks for this cohort — fixes must cite these when present. */
  market_evidence?: AuditMarketEvidence;
}

// ---------------------------------------------------------------------------
// AirROI provider contract (resolved listing + comps before scoring)
// ---------------------------------------------------------------------------

export interface ResolvedListing {
  airroi_listing_id: string;
  airbnb_url: string;
  listing: ListingInput;
  comps: CompsInput;
  /** Bali micro-market segment inferred from location (v2). */
  micro_market?: string;
  /** Target guest inferred from micro-market + property shape (v2). */
  target_guest?: string;
  /** Scanned-market key ("greater-canggu" | "dubai" | "london") or null if unscanned. */
  market_key?: string | null;
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
  /** Listing title at audit time — shown on the report so the owner sees what was analyzed. */
  listing_title: string | null;
  /** Hero photo URL at audit time (null in mock mode where photos are captions). */
  listing_photo: string | null;
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
  /** Measured Canggu-cohort evidence + winner cover examples (null off-market). */
  market_evidence: AuditMarketEvidence | null;
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
