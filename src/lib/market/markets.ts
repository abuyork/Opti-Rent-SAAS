import type { CohortDef } from "./types";

/**
 * Scannable market definitions. Each market is a radius geofence + optional
 * locality allowlist + bedroom cohorts. Canggu needs the allowlist because a
 * 3-mile radius bleeds into non-Canggu areas; for Dubai/London the radius IS
 * the geofence (probed 2026-07-13: locality values are borough/district-level
 * and all belong to the market).
 */
export interface MarketDef {
  key: string; // slug used in filenames, DB rows, benchmarks
  title: string; // human name for playbooks/prompts
  center: { latitude: number; longitude: number };
  radiusMiles: number;
  /** Substrings a listing's locality/district must match; null = accept all in radius. */
  localityAllow: string[] | null;
  /**
   * Substrings that EXCLUDE a listing even inside the radius. Used where two
   * market circles overlap (e.g. Seminyak's circle clips Greater Canggu) so a
   * listing is sampled by exactly one market. Checked before localityAllow.
   */
  localityBlock?: string[];
  cohorts: CohortDef[];
  /** Native currency label for the playbook (AirROI returns native amounts). */
  currency: string;
}

const STANDARD_COHORTS: CohortDef[] = [
  { label: "1BR", bedrooms: { eq: 1 } },
  { label: "2BR", bedrooms: { eq: 2 } },
  { label: "3BR", bedrooms: { eq: 3 } },
  { label: "4BR", bedrooms: { eq: 4 } },
  { label: "5+BR", bedrooms: { gte: 5 } },
];

/**
 * Greater Canggu's locality allowlist — THE source of truth for what counts as
 * Canggu (audit detection derives from it; see the drift gotcha in live.ts).
 * Also reused as Seminyak's block list: Seminyak's circle clips this area.
 */
const CANGGU_LOCALITIES = [
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

export const MARKETS: Record<string, MarketDef> = {
  "greater-canggu": {
    key: "greater-canggu",
    title: "Greater Canggu",
    center: { latitude: -8.6478, longitude: 115.1385 },
    radiusMiles: 3,
    localityAllow: CANGGU_LOCALITIES,
    cohorts: STANDARD_COHORTS,
    currency: "IDR",
  },
  // --- Bali full-island rollout (2026-07-20). Counts from the region probe:
  // Seminyak 5,853 · Ubud 4,539 · Bukit 4,223 · Sanur 836 · Nusa Dua 499 ·
  // Lovina 386 · Nusa Islands 317 · Amed 258 active entire homes. Circles that
  // overlap a neighbour carry a localityBlock so each listing belongs to
  // exactly one market. Detection order lives in BALI_DETECTION_ORDER below.
  seminyak: {
    key: "seminyak",
    title: "Seminyak, Legian & Kuta",
    center: { latitude: -8.6905, longitude: 115.1655 },
    radiusMiles: 2.5,
    localityAllow: null,
    localityBlock: CANGGU_LOCALITIES, // circle clips Greater Canggu to the north
    cohorts: STANDARD_COHORTS,
    currency: "IDR",
  },
  ubud: {
    key: "ubud",
    title: "Ubud",
    center: { latitude: -8.5069, longitude: 115.2625 },
    radiusMiles: 4,
    localityAllow: null,
    cohorts: STANDARD_COHORTS,
    currency: "IDR",
  },
  "uluwatu-bukit": {
    key: "uluwatu-bukit",
    title: "Uluwatu & the Bukit",
    center: { latitude: -8.8, longitude: 115.13 },
    radiusMiles: 5,
    localityAllow: null,
    localityBlock: ["benoa", "nusa dua", "sawangan"], // east edge belongs to Nusa Dua
    cohorts: STANDARD_COHORTS,
    currency: "IDR",
  },
  sanur: {
    key: "sanur",
    title: "Sanur",
    center: { latitude: -8.685, longitude: 115.262 },
    radiusMiles: 2.5,
    localityAllow: null,
    cohorts: STANDARD_COHORTS,
    currency: "IDR",
  },
  "nusa-dua": {
    key: "nusa-dua",
    title: "Nusa Dua & Benoa",
    center: { latitude: -8.795, longitude: 115.225 },
    radiusMiles: 3,
    localityAllow: null,
    localityBlock: ["jimbaran", "pecatu", "ungasan", "kutuh", "balangan"], // west edge is Bukit
    cohorts: STANDARD_COHORTS,
    currency: "IDR",
  },
  amed: {
    key: "amed",
    title: "Amed & the East Coast",
    center: { latitude: -8.336, longitude: 115.663 },
    radiusMiles: 7,
    localityAllow: null,
    cohorts: STANDARD_COHORTS,
    currency: "IDR",
  },
  lovina: {
    key: "lovina",
    title: "Lovina & the North Coast",
    center: { latitude: -8.16, longitude: 115.025 },
    radiusMiles: 7,
    localityAllow: null,
    cohorts: STANDARD_COHORTS,
    currency: "IDR",
  },
  "nusa-islands": {
    key: "nusa-islands",
    title: "Nusa Penida & Lembongan",
    center: { latitude: -8.73, longitude: 115.54 },
    radiusMiles: 7,
    localityAllow: null,
    cohorts: STANDARD_COHORTS,
    currency: "IDR",
  },
  dubai: {
    key: "dubai",
    title: "Dubai",
    // Between Marina/JBR and Downtown/Business Bay; 15mi spans Palm Jumeirah
    // through Downtown to Creek Harbour (probed live).
    center: { latitude: 25.1, longitude: 55.2 },
    radiusMiles: 15,
    localityAllow: null,
    // Dubai stock is ~96% apartments; studios are not coded as bedrooms=0 in
    // AirROI (probe returned 6 rows), so 1BR..5+BR covers the market.
    cohorts: STANDARD_COHORTS,
    currency: "AED",
  },
  london: {
    key: "london",
    title: "London",
    center: { latitude: 51.5074, longitude: -0.1278 },
    radiusMiles: 8,
    localityAllow: null,
    cohorts: STANDARD_COHORTS,
    currency: "GBP",
  },
};

/**
 * Locality allow/block rules for one market. Shared by the scanner's sample
 * filter AND audit market detection so the two can never drift (a hand-copied
 * regex once dropped Kuta Utara from detection while the scanner kept it).
 */
export function passesLocalityRules(def: MarketDef, localityHay: string): boolean {
  const hay = localityHay.toLowerCase();
  if (def.localityBlock?.some((b) => hay.includes(b))) return false;
  if (def.localityAllow) return def.localityAllow.some((a) => hay.includes(a));
  return true;
}

/** Great-circle distance in miles (haversine). */
export function distanceMiles(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Which Bali market does a listing belong to? Checked in this order so that
 * where circles touch, the more specific market claims the listing — mirrors
 * the scanners' block lists exactly (Canggu's allowlist beats Seminyak's
 * circle; the Bukit beats Nusa Dua for Kutuh/Balangan; blocks apply first).
 */
const BALI_DETECTION_ORDER = [
  "greater-canggu",
  "seminyak",
  "uluwatu-bukit",
  "nusa-dua",
  "sanur",
  "ubud",
  "amed",
  "lovina",
  "nusa-islands",
];

/**
 * Resolve a Bali listing to a scanned market key, or null when uncovered.
 * Allowlist markets (Canggu) match on locality alone — same behavior the audit
 * always had. Radius-geofenced markets need coordinates (AirROI provides them
 * on every listing) and use the SAME center+radius the scanner sampled with.
 */
export function baliMarketKey(loc: {
  latitude?: number | null;
  longitude?: number | null;
  localityHay: string;
}): string | null {
  for (const key of BALI_DETECTION_ORDER) {
    const def = MARKETS[key];
    if (!def || !passesLocalityRules(def, loc.localityHay)) continue;
    if (def.localityAllow) return key; // allowlist IS the geofence
    if (
      loc.latitude != null &&
      loc.longitude != null &&
      distanceMiles(def.center, { latitude: loc.latitude, longitude: loc.longitude }) <=
        // Detection must be slightly LOOSER than sampling: AirROI's radius
        // search put edge listings (Lembongan at ~7.05mi of 7) inside the
        // sample, so a strict check would deny scanned listings their own
        // evidence. Blocks + priority order still settle contested borders.
        def.radiusMiles * 1.1
    ) {
      return key;
    }
  }
  return null;
}

export function getMarketDef(key: string): MarketDef {
  const def = MARKETS[key];
  if (!def) {
    throw new Error(
      `Unknown market "${key}". Available: ${Object.keys(MARKETS).join(", ")}`,
    );
  }
  return def;
}
