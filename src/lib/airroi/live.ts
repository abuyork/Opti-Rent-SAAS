import type {
  CompsInput,
  ListingInput,
  ResolvedListing,
  ReviewSummary,
} from "@/lib/types";
import { config } from "@/lib/config";
import { AirRoiError, type AirRoiProvider } from "./provider";
import { resolveAirbnbListingId } from "./url";
import { MARKETS } from "@/lib/market/markets";
import { fetchAirbnbCoverUrl, reorderWithCover } from "./cover";

/** Shown to owners when AirROI simply has no data for their (valid) listing. */
const NO_DATA_MESSAGE =
  "We don't have market data on this specific villa yet — this can happen with " +
  "newer or less-active listings. Try another villa, or check back soon.";

/**
 * Live AirROI adapter (Build Pack §4 steps 2–4).
 *
 * Verified against the AirROI API (https://www.airroi.com/api/documentation):
 *   1. URL → Airbnb room id (the id AirROI keys on — no resolve call needed).
 *   2. GET /listings?id=&currency=native   → full content + performance.
 *   3. GET /listings/comparables?...        → comp set; we aggregate the benchmark.
 *
 * `currency=native` returns IDR for Bali listings, which is what underpricing_idr
 * expects. AirROI's /listings returns the full description + ordered photo_urls,
 * so no content scrape is needed (content_fallback stays false). It does NOT
 * return individual review text, so ReviewSummary.recent is left empty and the
 * reviews band is scored from rating + count only.
 */

// --- Subset of the AirROI response we consume ---
interface AirRoiListing {
  listing_info?: {
    listing_id?: number | string;
    listing_name?: string;
    description?: string;
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
    rating_cleanliness?: number | null;
    rating_location?: number | null;
  };
  performance_metrics?: {
    ttm_avg_rate?: number | null;
    l90d_avg_rate?: number | null;
    ttm_occupancy?: number | null;
  };
  location_info?: {
    latitude?: number;
    longitude?: number;
    locality?: string;
    district?: string;
    region?: string;
    country_code?: string;
  };
  booking_settings?: {
    instant_book?: boolean | null;
    min_nights?: number | null;
    cancellation_policy?: string;
  };
  host_info?: {
    superhost?: boolean;
    professional_management?: boolean;
  };
  pricing_info?: { currency?: string };
}

const POOL_RE = /pool/i;

export class LiveAirRoiProvider implements AirRoiProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.baseUrl = config.airroi.baseUrl.replace(/\/$/, "");
    this.apiKey = config.airroi.apiKey;
    if (!this.apiKey) {
      throw new AirRoiError(
        "AIRROI_API_KEY is not set but AIRROI_MODE=live. Set the key or use mock mode.",
      );
    }
  }

  async resolve(airbnbUrl: string): Promise<ResolvedListing> {
    const id = await resolveAirbnbListingId(airbnbUrl);

    let subject: AirRoiListing;
    try {
      subject = await this.get<AirRoiListing>("/listings", {
        id,
        currency: "native",
      });
    } catch (e) {
      // AirROI 404 = the listing isn't in their database. Not our bug; show a
      // friendly message instead of the raw API text.
      if (e instanceof AirRoiError && e.status === 404) {
        throw new AirRoiError(`AirROI has no data for listing ${id}`, {
          status: 404,
          userMessage: NO_DATA_MESSAGE,
        });
      }
      throw e;
    }
    if (!subject.listing_info) {
      throw new AirRoiError(`AirROI returned empty content for listing ${id}`, {
        userMessage: NO_DATA_MESSAGE,
      });
    }

    const pd = subject.property_details ?? {};
    const loc = subject.location_info ?? {};
    // Comps and the true cover (AirROI photo order ≠ Airbnb display order) are
    // independent fetches; cover failure just leaves the order unverified.
    const [comps, coverUrl] = await Promise.all([
      this.getComparables(loc, pd),
      fetchAirbnbCoverUrl(airbnbUrl),
    ]);

    return this.map(id, airbnbUrl, subject, comps, coverUrl);
  }

  // --- HTTP ---
  private async get<T>(path: string, query: Record<string, string>): Promise<T> {
    const qs = new URLSearchParams(query).toString();
    const res = await fetch(`${this.baseUrl}${path}?${qs}`, {
      headers: { "x-api-key": this.apiKey, "Content-Type": "application/json" },
      // Per-listing ~24h caching (Build Pack §8) is layered on later via airroi_snapshots.
      cache: "no-store",
    });
    const text = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new AirRoiError(`AirROI ${path} returned non-JSON (HTTP ${res.status}).`);
    }
    if (!res.ok) {
      const msg = (json as { message?: string })?.message ?? `HTTP ${res.status}`;
      throw new AirRoiError(`AirROI ${path}: ${msg}`, { status: res.status });
    }
    return json as T;
  }

  private async getComparables(
    loc: AirRoiListing["location_info"],
    pd: AirRoiListing["property_details"],
  ): Promise<AirRoiListing[]> {
    if (loc?.latitude == null || loc?.longitude == null) return [];
    const query: Record<string, string> = {
      latitude: String(loc.latitude),
      longitude: String(loc.longitude),
      bedrooms: String(pd?.bedrooms ?? 0),
      baths: String(pd?.baths ?? 0),
      guests: String(pd?.guests ?? 0),
      currency: "native",
    };
    const data = await this.get<{ listings?: AirRoiListing[] }>(
      "/listings/comparables",
      query,
    );
    return data.listings ?? [];
  }

  // --- Mapping AirROI → our scoring inputs ---
  private map(
    id: string,
    url: string,
    s: AirRoiListing,
    comps: AirRoiListing[],
    coverUrl: string | null,
  ): ResolvedListing {
    const info = s.listing_info ?? {};
    const pd = s.property_details ?? {};
    const ratings = s.ratings ?? {};
    const perf = s.performance_metrics ?? {};
    const loc = s.location_info ?? {};
    const booking = s.booking_settings ?? {};
    const host = s.host_info ?? {};

    const amenities = pd.amenities ?? [];
    const area = loc.district || loc.locality || loc.region || "the area";
    const micro_market = microMarket(loc);
    const target_guest = targetGuest(micro_market);
    const market_key = marketKey(loc);

    const reviews: ReviewSummary = {
      count: ratings.num_reviews ?? 0,
      rating: ratings.rating_overall ?? null,
      recent: [], // AirROI does not expose review text
      cleanliness: ratings.rating_cleanliness ?? null,
      location: ratings.rating_location ?? null,
    };

    const nightlyRate = Math.round(perf.ttm_avg_rate ?? perf.l90d_avg_rate ?? 0);

    const cover = reorderWithCover(info.photo_urls ?? [], coverUrl);

    const listing: ListingInput = {
      title: info.listing_name ?? "",
      description: stripHtml(info.description ?? ""),
      photos: cover.photos,
      cover_verified: cover.cover_verified,
      photos_count: info.photos_count ?? info.photo_urls?.length ?? 0,
      amenities,
      reviews,
      beds: pd.bedrooms ?? 0,
      baths: pd.baths ?? 0,
      area,
      pool: amenities.some((a) => POOL_RE.test(a)),
      nightly_rate: nightlyRate,
      instant_book: booking.instant_book ?? null,
      min_nights: booking.min_nights ?? null,
      cancellation_policy: booking.cancellation_policy,
      superhost: host.superhost,
      guest_favorite: info.guest_favorite,
    };

    const compsInput = aggregateComps(comps, area, pd.bedrooms ?? 0);

    return {
      // Use the URL-derived id (exact string). AirROI returns listing_id as a
      // JSON number, which loses precision above 2^53 — don't read it back.
      airroi_listing_id: id,
      airbnb_url: url,
      listing,
      comps: compsInput,
      micro_market,
      target_guest,
      market_key,
      content_fallback: false,
    };
  }
}

// --- Market detection (which scanned benchmark set applies) ---

/**
 * Map a listing's location to one of our scanned markets ("greater-canggu",
 * "dubai", "london") or null when we have no playbook for it.
 *
 * The Canggu locality list comes from markets.ts — the SAME allowlist the
 * scanner samples with — so a listing inside the benchmarks can never be
 * denied its own market evidence (a hand-copied regex drifted once: Kuta
 * Utara villas were in the benchmarks but missed here).
 */
function marketKey(loc: AirRoiListing["location_info"]): string | null {
  const cc = (loc?.country_code ?? "").toUpperCase();
  const hay = [loc?.district, loc?.locality, loc?.region]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (cc === "AE" && /dubai/.test(hay)) return "dubai";
  if (cc === "GB" && /london|westminster|camden|hackney|islington|kensington|chelsea|southwark|lambeth|tower hamlets/.test(hay))
    return "london";
  if (cc === "ID") {
    const allow = MARKETS["greater-canggu"]?.localityAllow ?? [];
    if (allow.some((a) => hay.includes(a))) return "greater-canggu";
  }
  return null;
}

// --- Bali micro-market inference (v2) ---

/** Map an AirROI location to a Bali micro-market segment. */
function microMarket(loc: AirRoiListing["location_info"]): string {
  const hay = [loc?.district, loc?.locality, loc?.region]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (/(canggu|berawa|pererenan|echo beach|umalas|kerobokan|tibubeneng|kuta utara|munggu|babakan|cemagi)/.test(hay))
    return "Canggu/Berawa";
  if (/(uluwatu|pecatu|bukit|bingin|padang|ungasan)/.test(hay)) return "Uluwatu/Bukit";
  if (/seminyak/.test(hay)) return "Seminyak";
  if (/ubud/.test(hay)) return "Ubud";
  if (/(sanur)/.test(hay)) return "Sanur";
  return loc?.locality || loc?.region || "Bali";
}

/** Infer the dominant guest driver for a micro-market (v2 segment match). */
function targetGuest(market: string): string {
  switch (market) {
    case "Canggu/Berawa":
      return "digital nomads / surfers / long-stay remote workers";
    case "Uluwatu/Bukit":
      return "couples & groups chasing cliff/ocean views";
    case "Seminyak":
      return "design-forward luxury travellers";
    case "Ubud":
      return "wellness & nature seekers";
    default:
      return "couples, families and groups";
  }
}

// --- Aggregation helpers ---

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  // Round BOTH branches: AirROI rates are floats (e.g. 4489194.7) and this
  // benchmark feeds underpricing_idr, a bigint column — a fractional median
  // from an odd-sized comp set fails the DB write.
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : Math.round(sorted[mid]);
}

function aggregateComps(
  comps: AirRoiListing[],
  area: string,
  bedCount: number,
): CompsInput {
  const rates = comps
    .map((c) => c.performance_metrics?.ttm_avg_rate ?? c.performance_metrics?.l90d_avg_rate)
    .filter((r): r is number => typeof r === "number" && r > 0);

  const photoCounts = comps
    .map((c) => c.listing_info?.photos_count ?? c.listing_info?.photo_urls?.length)
    .filter((n): n is number => typeof n === "number" && n > 0);

  // Amenities present in >= 50% of comps.
  const counts = new Map<string, { n: number; label: string }>();
  for (const c of comps) {
    const seen = new Set<string>();
    for (const a of c.property_details?.amenities ?? []) {
      const key = a.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const entry = counts.get(key) ?? { n: 0, label: a };
      entry.n += 1;
      counts.set(key, entry);
    }
  }
  const threshold = Math.max(1, Math.ceil(comps.length / 2));
  const commonAmenities = [...counts.values()]
    .filter((e) => e.n >= threshold)
    .sort((a, b) => b.n - a.n)
    .slice(0, 12)
    .map((e) => e.label);

  const poolShare = comps.length
    ? comps.filter((c) =>
        (c.property_details?.amenities ?? []).some((a) => POOL_RE.test(a)),
      ).length / comps.length
    : 0;
  const poolTier =
    poolShare >= 0.8
      ? "almost all comps have a private pool"
      : poolShare >= 0.4
        ? "most comps have a private pool"
        : "some comps have a private pool";

  const avgPhotoCount = photoCounts.length
    ? Math.round(photoCounts.reduce((a, b) => a + b, 0) / photoCounts.length)
    : 0;

  // Representative comp titles so rewrites can be positioned against the market.
  const sampleTitles = [
    ...new Set(
      comps
        .map((c) => c.listing_info?.listing_name?.trim())
        .filter((t): t is string => !!t),
    ),
  ].slice(0, 8);

  const gfShare = comps.length
    ? comps.filter((c) => c.listing_info?.guest_favorite).length / comps.length
    : 0;
  const qualityTier =
    gfShare >= 0.5
      ? "many comps are Guest Favorites — a high-quality set"
      : gfShare >= 0.2
        ? "a meaningful share of comps are Guest Favorites"
        : "few comps hold the Guest Favorite badge";

  return {
    comp_count: comps.length,
    area,
    bed_count: bedCount,
    avg_photo_count: avgPhotoCount,
    benchmark_nightly_rate: median(rates),
    common_amenities: commonAmenities,
    pool_tier: poolTier,
    quality_tier: qualityTier,
    sample_titles: sampleTitles,
  };
}

/** Strip Airbnb's HTML description to readable plain text. */
function stripHtml(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
