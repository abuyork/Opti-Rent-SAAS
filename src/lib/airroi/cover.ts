/**
 * True-cover detection. AirROI's `photo_urls` come back in an order that does
 * NOT always match the listing's display order on Airbnb, so "image 1" may not
 * be the real cover — which made vision scoring critique the wrong photo. The
 * listing page's `og:image` meta tag is always the actual cover; we fetch it
 * and put it first so the scorer judges what guests really see in search.
 */

const OG_IMAGE_RE =
  /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i;
const OG_IMAGE_RE_REVERSED =
  /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i;

/** Fetch the listing page and extract its og:image (the real cover). Null on any failure. */
export async function fetchAirbnbCoverUrl(airbnbUrl: string): Promise<string | null> {
  try {
    const res = await fetch(airbnbUrl, {
      headers: {
        // Airbnb serves og: tags to link-preview agents; a plain UA gets blocked.
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const html = await res.text();
    const m = OG_IMAGE_RE.exec(html) ?? OG_IMAGE_RE_REVERSED.exec(html);
    return m ? m[1].replace(/&amp;/g, "&") : null;
  } catch {
    return null; // network/timeout/blocked — caller falls back to unverified order
  }
}

/** Identity key for a muscache CDN image: the filename, ignoring host/params/size policy. */
function imageKey(url: string): string {
  try {
    const path = new URL(url).pathname;
    return path.slice(path.lastIndexOf("/") + 1).toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

export interface CoverResult {
  /** Photos with the verified cover first (input order otherwise preserved). */
  photos: string[];
  /** True when the real cover was identified and is now photos[0]. */
  cover_verified: boolean;
}

/**
 * Reorder `photos` so the listing's real cover is first. If the og:image isn't
 * among the provider's URLs (different CDN path), prepend it — showing the true
 * cover matters more than a possible near-duplicate later in the set.
 */
export function reorderWithCover(photos: string[], coverUrl: string | null): CoverResult {
  if (!coverUrl) return { photos, cover_verified: false };
  const key = imageKey(coverUrl);
  const idx = photos.findIndex((p) => imageKey(p) === key);
  if (idx === 0) return { photos, cover_verified: true };
  if (idx > 0) {
    return {
      photos: [photos[idx], ...photos.slice(0, idx), ...photos.slice(idx + 1)],
      cover_verified: true,
    };
  }
  return { photos: [coverUrl, ...photos], cover_verified: true };
}
