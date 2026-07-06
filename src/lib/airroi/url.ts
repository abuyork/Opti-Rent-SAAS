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

const NO_ID_MESSAGE =
  "Couldn't find an Airbnb listing id in that URL. Paste the full listing link " +
  "(the one with /rooms/ in it).";

/** Hosts we'll hit the network for to expand a short/vanity link. */
function isAirbnbHost(host: string): boolean {
  const h = host.toLowerCase();
  return h === "abnb.me" || h.endsWith(".abnb.me") || /(^|\.)airbnb\.[a-z.]+$/.test(h);
}

function tryParse(input: string): string | null {
  try {
    return parseAirbnbListingId(input);
  } catch {
    return null;
  }
}

/**
 * Resolve an Airbnb listing id from any pasted link, including short/app-share
 * links (e.g. https://abnb.me/xxxx) and vanity paths that redirect to /rooms/.
 *
 * Fast path: if the id is already in the string, parse it synchronously (no
 * network). Otherwise, for Airbnb-family hosts, follow redirects and read the
 * final URL (and, as a fallback, scan the page HTML for the id).
 */
export async function resolveAirbnbListingId(input: string): Promise<string> {
  const direct = tryParse(input);
  if (direct) return direct;

  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    throw new AirRoiError("Enter a valid Airbnb listing URL.", {
      userMessage: "Enter a valid Airbnb listing URL.",
    });
  }
  if (!isAirbnbHost(u.hostname)) {
    throw new AirRoiError(NO_ID_MESSAGE, { userMessage: NO_ID_MESSAGE });
  }

  const resolved = await followToListingId(u.toString());
  if (resolved) return resolved;

  throw new AirRoiError(NO_ID_MESSAGE, { userMessage: NO_ID_MESSAGE });
}

/** Follow redirects and extract the listing id from the final URL, then HTML. */
async function followToListingId(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
    });
    // The final URL after redirects usually already contains /rooms/<id>.
    const fromUrl = tryParse(res.url);
    if (fromUrl) return fromUrl;
    // Fallback: dig the id out of the listing page HTML.
    const body = await res.text();
    const m =
      body.match(/\/rooms\/(\d{5,})/) ??
      body.match(/StayListing:(\d{5,})/) ??
      body.match(/"listingId"\s*:\s*"?(\d{5,})"?/);
    return m ? m[1] : null;
  } catch {
    return null; // network/timeout → treat as unresolvable
  } finally {
    clearTimeout(timer);
  }
}
