import type { ResolvedListing } from "@/lib/types";
import { config } from "@/lib/config";
import { AirRoiError, type AirRoiProvider } from "./provider";

/**
 * Live AirROI adapter.
 *
 * STATUS: skeleton pending confirmed AirROI API access. The exact endpoints and
 * response shapes must be verified against the AirROI docs (Build Pack §3
 * "verify first"). The structure below shows where each Build Pack §4 step maps:
 *
 *   1. resolve Airbnb URL → AirROI listing id
 *   2. fetch listing content (title, description, ordered photos, amenities, reviews)
 *   3. fetch comparables → comp set + benchmark nightly rate
 *   4. (caller) underpricing = benchmark − listing rate
 *
 * If `/listings` lacks a full description / ordered photos, add a light content
 * scrape here and set `content_fallback = true`.
 */
export class LiveAirRoiProvider implements AirRoiProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.baseUrl = config.airroi.baseUrl;
    this.apiKey = config.airroi.apiKey;
    if (!this.apiKey) {
      throw new AirRoiError(
        "AIRROI_API_KEY is not set but AIRROI_MODE=live. Set the key or use mock mode.",
      );
    }
  }

  async resolve(_airbnbUrl: string): Promise<ResolvedListing> {
    // TODO: implement against real AirROI endpoints once access is confirmed.
    //   const listing = await this.get(`/listings/resolve?url=${enc(airbnbUrl)}`);
    //   const content = await this.get(`/listings/${listing.id}`);
    //   const comps   = await this.get(`/listings/${listing.id}/comparables`);
    //   return mapToResolvedListing(content, comps);
    throw new AirRoiError(
      "LiveAirRoiProvider.resolve is not implemented yet — confirm AirROI API contract first (Build Pack §3).",
    );
  }

  // private async get<T>(path: string): Promise<T> {
  //   const res = await fetch(`${this.baseUrl}${path}`, {
  //     headers: { Authorization: `Bearer ${this.apiKey}` },
  //     // Cache per listing ~24h is handled one layer up (airroi_snapshots).
  //   });
  //   if (!res.ok) throw new AirRoiError(`AirROI ${path} → ${res.status}`);
  //   return (await res.json()) as T;
  // }
}
