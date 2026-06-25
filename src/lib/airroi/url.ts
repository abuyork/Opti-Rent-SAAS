import { AirRoiError } from "./provider";

/**
 * Extract the Airbnb listing id from a user-pasted URL (or a bare id).
 * AirROI keys listings by the raw Airbnb room id, so no resolve call is needed.
 *
 * Handles:
 *   https://www.airbnb.com/rooms/12345678
 *   https://www.airbnb.com/rooms/plus/12345678
 *   https://airbnb.com/rooms/12345678?check_in=...
 *   https://www.airbnb.co.id/rooms/12345678
 *   12345678            (bare id)
 *
 * Airbnb ids can exceed JS's safe integer range, so they are kept as strings.
 */
export function parseAirbnbListingId(input: string): string {
  const s = input.trim();
  if (/^\d{6,}$/.test(s)) return s;

  let u: URL;
  try {
    u = new URL(s);
  } catch {
    throw new AirRoiError("Enter a valid Airbnb listing URL.");
  }

  const fromPath = u.pathname.match(/\/rooms\/(?:plus\/)?(\d+)/);
  if (fromPath) return fromPath[1];

  // Fall back to a trailing numeric path segment, then any numeric query value.
  const lastSeg = u.pathname.split("/").filter(Boolean).pop() ?? "";
  if (/^\d{6,}$/.test(lastSeg)) return lastSeg;

  throw new AirRoiError(
    "Couldn't find an Airbnb listing id in that URL. Paste the full listing link.",
  );
}
