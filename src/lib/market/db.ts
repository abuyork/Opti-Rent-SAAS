import { config } from "@/lib/config";
import type { ScannedListing } from "./types";

/**
 * Persist a scan snapshot to `market_listings` (migration 0003) via PostgREST
 * directly — supabase-js needs Node 22+ (native WebSocket for its realtime
 * client) and this CLI runs on plain Node; a fetch upsert has no such needs.
 * Service-role only, mirroring the audit store. Upserts on the primary key so
 * a re-run on the same day overwrites instead of failing.
 */
export async function persistScan(
  market: string,
  listings: ScannedListing[],
): Promise<void> {
  if (!config.supabase.url || !config.supabase.serviceRoleKey) {
    throw new Error("Supabase is not configured — run with --dry to skip persistence.");
  }

  const rows = listings.map((l) => ({
    market,
    listing_id: l.listing_id,
    cohort: l.cohort,
    stratum: l.stratum,
    listing_name: l.listing_name,
    locality: l.locality,
    bedrooms: l.bedrooms,
    ttm_revpar: l.ttm_revpar,
    ttm_occupancy: l.ttm_occupancy,
    ttm_avg_rate: l.ttm_avg_rate,
    ttm_revenue: l.ttm_revenue,
    rating_overall: l.rating_overall,
    num_reviews: l.num_reviews,
    guest_favorite: l.guest_favorite,
    superhost: l.superhost,
    instant_book: l.instant_book,
    min_nights: l.min_nights,
    photos_count: l.photos_count,
    cover_photo_url: l.cover_photo_url,
    title_chars: l.listing_name.length,
    description_chars: l.description.length,
    amenities: l.amenities,
    viral_score: l.viral_score,
  }));

  for (let i = 0; i < rows.length; i += 200) {
    const res = await fetch(`${config.supabase.url}/rest/v1/market_listings`, {
      method: "POST",
      headers: {
        apikey: config.supabase.serviceRoleKey,
        Authorization: `Bearer ${config.supabase.serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(rows.slice(i, i + 200)),
    });
    if (!res.ok) {
      throw new Error(`persistScan failed: HTTP ${res.status} ${await res.text()}`);
    }
  }
}
