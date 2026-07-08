/**
 * Market-scan domain types (Canggu viral-score scanner, Manager feedback
 * 2026-07). A scan stratified-samples each bedroom cohort (top / mid / bottom
 * by TTM RevPAR), scores every listing within its cohort, and contrasts
 * winners vs losers to extract what actually drives revenue.
 */

/** Subset of an AirROI search-result listing we consume (shape verified live). */
export interface MarketSearchListing {
  listing_info?: {
    listing_id?: number | string;
    listing_name?: string;
    description?: string;
    cover_photo_url?: string;
    photo_urls?: string[];
    photos_count?: number;
    guest_favorite?: boolean;
  };
  property_details?: {
    guests?: number;
    bedrooms?: number;
    beds?: number;
    baths?: number;
    amenities?: string[];
  };
  ratings?: {
    num_reviews?: number;
    rating_overall?: number | null;
  };
  performance_metrics?: {
    ttm_revpar?: number | null;
    ttm_revenue?: number | null;
    ttm_occupancy?: number | null;
    ttm_avg_rate?: number | null;
    ttm_available_days?: number | null;
  };
  location_info?: {
    locality?: string;
    district?: string;
    latitude?: number;
    longitude?: number;
  };
  booking_settings?: {
    instant_book?: boolean | null;
    min_nights?: number | null;
  };
  host_info?: {
    superhost?: boolean;
    professional_management?: boolean;
  };
}

export type Stratum = "top" | "mid" | "bottom";

/** One scanned listing, flattened + scored. */
export interface ScannedListing {
  listing_id: string;
  listing_name: string;
  description: string;
  locality: string;
  bedrooms: number;
  cohort: string; // "1BR" … "5+BR"
  stratum: Stratum;
  ttm_revpar: number;
  ttm_occupancy: number;
  ttm_avg_rate: number;
  ttm_revenue: number;
  rating_overall: number | null;
  num_reviews: number;
  guest_favorite: boolean;
  superhost: boolean;
  instant_book: boolean | null;
  min_nights: number | null;
  photos_count: number;
  cover_photo_url: string | null;
  amenities: string[];
  /** 0–100 percentile blend within the cohort sample. */
  viral_score: number;
}

export interface CohortDef {
  label: string;
  /** AirROI filter fragment for bedrooms, e.g. { eq: 2 } or { gte: 5 }. */
  bedrooms: Record<string, number>;
}

export interface GroupStats {
  n: number;
  median_photos: number;
  median_adr: number;
  median_occupancy: number;
  median_revpar: number;
  median_title_chars: number;
  median_description_chars: number;
  median_min_nights: number;
  instant_book_share: number;
  superhost_share: number;
  guest_favorite_share: number;
}

export interface CohortStats {
  cohort: string;
  sample_size: number;
  winners: GroupStats;
  losers: GroupStats;
  /** Amenity prevalence delta (winners share − losers share), best first. */
  amenity_edges: { amenity: string; winners: number; losers: number; delta: number }[];
  /** Title keyword frequency delta (winners − losers), best first. */
  title_keywords: { word: string; winners: number; losers: number; delta: number }[];
}

/** Claude-extracted qualitative findings, each tied to cited evidence. */
export interface PlaybookFindings {
  cover_patterns: PatternFinding[];
  title_patterns: PatternFinding[];
  description_patterns: PatternFinding[];
  amenity_patterns: PatternFinding[];
  pricing_patterns: PatternFinding[];
  top_actions: string[];
}

export interface PatternFinding {
  finding: string;
  evidence: string;
}
