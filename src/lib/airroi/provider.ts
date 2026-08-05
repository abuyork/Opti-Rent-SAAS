import type { ResolvedListing } from "@/lib/types";

/**
 * AirROI provider contract. Given an Airbnb URL, resolve the listing to the
 * content + comp inputs the scoring engine needs (Build Pack §4 steps 2–4).
 *
 * The spec flags an open question (§3): does AirROI `/listings` return a full
 * description + ordered photos fresh enough to score? The interface hides that:
 * a `live` adapter can transparently fall back to a content scrape and set
 * `content_fallback = true` without the caller caring.
 */
export interface AirRoiProvider {
  /** Resolve an Airbnb URL to a listing + comp set + benchmark rate. */
  resolve(airbnbUrl: string): Promise<ResolvedListing>;
}

export interface AirRoiErrorOptions {
  /** Upstream HTTP status, when the error came from an AirROI response. */
  status?: number;
  /** Owner-facing message shown in the UI. Defaults to a generic friendly line. */
  userMessage?: string;
}

/**
 * Generic owner-facing fallback. A raw upstream message ("A valid and active
 * API key is required") leaked to a real user once (manager report 2026-08-05)
 * because userMessage used to default to `message`. Provider/internal detail
 * now NEVER reaches the UI unless a path explicitly sets a friendly message.
 */
export const GENERIC_DATA_ERROR_MESSAGE =
  "We couldn't pull fresh market data for this listing just now. " +
  "Give it a minute and try again.";

export class AirRoiError extends Error {
  readonly status?: number;
  readonly userMessage: string;

  constructor(message: string, options: AirRoiErrorOptions = {}) {
    super(message);
    this.name = "AirRoiError";
    this.status = options.status;
    this.userMessage = options.userMessage ?? GENERIC_DATA_ERROR_MESSAGE;
  }
}
