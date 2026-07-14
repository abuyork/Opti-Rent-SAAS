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

export const MARKETS: Record<string, MarketDef> = {
  "greater-canggu": {
    key: "greater-canggu",
    title: "Greater Canggu",
    center: { latitude: -8.6478, longitude: 115.1385 },
    radiusMiles: 3,
    localityAllow: [
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
    ],
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

export function getMarketDef(key: string): MarketDef {
  const def = MARKETS[key];
  if (!def) {
    throw new Error(
      `Unknown market "${key}". Available: ${Object.keys(MARKETS).join(", ")}`,
    );
  }
  return def;
}
