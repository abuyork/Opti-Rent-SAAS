import { config } from "@/lib/config";
import type { CohortDef, MarketSearchListing, ScannedListing, Stratum } from "./types";

/**
 * Stratified Greater-Canggu sampler over AirROI `POST /listings/search/radius`.
 *
 * Each search call returns full listing content + TTM performance (verified
 * live 2026-07-08), so a scan is search calls only. The API caps page_size at
 * 10, so per bedroom cohort we page the top and the bottom of the RevPAR
 * distribution — winners mean nothing without laggards to contrast against.
 * 2 pages × 2 strata = 4 calls/cohort ≈ $2/cohort.
 */

// Canggu centre; 3 miles spans Berawa→Pererenan/Munggu (verified via probe).
const CANGGU = { latitude: -8.6478, longitude: 115.1385, radius_miles: 3 };

/** Greater-Canggu localities (AirROI `locality` values seen in probes). */
const LOCALITY_ALLOW = [
  "canggu",
  "berawa",
  "pererenan",
  "munggu",
  "tibubeneng",
  "kuta utara",
  "umalas",
  "kerobokan",
  "babakan",
  "cemagi",
];

export const COHORTS: CohortDef[] = [
  { label: "1BR", bedrooms: { eq: 1 } },
  { label: "2BR", bedrooms: { eq: 2 } },
  { label: "3BR", bedrooms: { eq: 3 } },
  { label: "4BR", bedrooms: { eq: 4 } },
  { label: "5+BR", bedrooms: { gte: 5 } },
];

interface SearchResponse {
  pagination: { total_count: number; page_size: number; offset: number };
  results: MarketSearchListing[];
}

/** API-enforced maximum page size (422 above this). */
export const MAX_PAGE_SIZE = 10;

async function search(
  body: Record<string, unknown>,
): Promise<SearchResponse> {
  const res = await fetch(`${config.airroi.baseUrl.replace(/\/$/, "")}/listings/search/radius`, {
    method: "POST",
    headers: { "x-api-key": config.airroi.apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as SearchResponse & { message?: string; errors?: string[] };
  if (!res.ok) {
    const detail = json.message ?? json.errors?.join("; ") ?? `HTTP ${res.status}`;
    throw new Error(`AirROI search: ${detail}`);
  }
  return json;
}

function isGreaterCanggu(l: MarketSearchListing): boolean {
  const hay = `${l.location_info?.locality ?? ""} ${l.location_info?.district ?? ""}`.toLowerCase();
  return LOCALITY_ALLOW.some((a) => hay.includes(a));
}

function flatten(l: MarketSearchListing, cohort: string, stratum: Stratum): ScannedListing | null {
  const info = l.listing_info ?? {};
  const perf = l.performance_metrics ?? {};
  if (info.listing_id == null || !perf.ttm_revpar) return null;
  return {
    listing_id: String(info.listing_id),
    listing_name: info.listing_name ?? "",
    description: info.description ?? "",
    locality: l.location_info?.locality || l.location_info?.district || "",
    bedrooms: l.property_details?.bedrooms ?? 0,
    cohort,
    stratum,
    ttm_revpar: perf.ttm_revpar ?? 0,
    ttm_occupancy: perf.ttm_occupancy ?? 0,
    ttm_avg_rate: perf.ttm_avg_rate ?? 0,
    ttm_revenue: perf.ttm_revenue ?? 0,
    rating_overall: l.ratings?.rating_overall ?? null,
    num_reviews: l.ratings?.num_reviews ?? 0,
    guest_favorite: info.guest_favorite ?? false,
    superhost: l.host_info?.superhost ?? false,
    instant_book: l.booking_settings?.instant_book ?? null,
    min_nights: l.booking_settings?.min_nights ?? null,
    photos_count: info.photos_count ?? info.photo_urls?.length ?? 0,
    cover_photo_url: info.cover_photo_url ?? info.photo_urls?.[0] ?? null,
    amenities: l.property_details?.amenities ?? [],
    viral_score: 0, // filled in by score()
  };
}

/**
 * Fetch one cohort as two strata (page_size caps at 10, so each stratum is
 * `pagesPerStratum` consecutive pages). Filters are identical across strata so
 * the contrast is fair: entire homes, active ≥90 days in the last year (dead
 * or barely-listed properties would pollute the "losers" group). Descending
 * pages give the winners; ascending pages reach the true tail without knowing
 * the exact total.
 */
export async function fetchCohort(
  cohort: CohortDef,
  pagesPerStratum: number,
  log: (msg: string) => void,
): Promise<ScannedListing[]> {
  const filter = {
    room_type: { eq: "entire_home" },
    bedrooms: cohort.bedrooms,
    ttm_available_days: { gte: 90 },
    // Ascending pages must reach low-but-ACTIVE listings; zero-revenue rows
    // (often brand-new or effectively dormant) carry no signal to learn from.
    ttm_revpar: { gte: 1 },
  };
  const base = { ...CANGGU, filter, currency: "native" };

  const pages = async (order: "desc" | "asc") => {
    const out: SearchResponse[] = [];
    for (let p = 0; p < pagesPerStratum; p++) {
      out.push(
        await search({
          ...base,
          sort: { ttm_revpar: order },
          pagination: { page_size: MAX_PAGE_SIZE, offset: p * MAX_PAGE_SIZE },
        }),
      );
    }
    return out;
  };
  const [topPages, bottomPages] = await Promise.all([pages("desc"), pages("asc")]);
  const total = topPages[0].pagination.total_count;

  const seen = new Set<string>();
  const out: ScannedListing[] = [];
  const take = (results: MarketSearchListing[], stratum: Stratum) => {
    for (const r of results) {
      if (!isGreaterCanggu(r)) continue;
      const flat = flatten(r, cohort.label, stratum);
      if (!flat || seen.has(flat.listing_id)) continue;
      seen.add(flat.listing_id);
      out.push(flat);
    }
  };
  for (const p of topPages) take(p.results, "top");
  for (const p of bottomPages) take(p.results, "bottom");

  log(
    `${cohort.label}: ${total} in market, sampled ${out.length} ` +
      `(top ${out.filter((o) => o.stratum === "top").length}, ` +
      `bottom ${out.filter((o) => o.stratum === "bottom").length}) after Greater-Canggu filter`,
  );
  return out;
}
