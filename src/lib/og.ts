/**
 * Open Graph / Twitter card blocks for the social sharing images (Max ask
 * 2026-08-06, via the Facebook sharing debugger). The cards live in public/og,
 * rendered by scripts/generate-og-cards.js from figures scraped off the live
 * pages — re-run it whenever the comp-set numbers change, or the images go
 * stale. og:title/description are deliberately omitted so each page's own
 * metadata flows into the tags.
 *
 * Next resolves a page's `openGraph` by replacing the layout's object wholesale
 * (no deep merge), which is why campaign pages spread this helper instead of
 * setting just `images`.
 */
export function socialCard(image: "home" | "bali" | "dubai" | "london") {
  const url = `/og/${image}.png`;
  return {
    openGraph: {
      type: "website" as const,
      siteName: "OptimoRent",
      images: [
        {
          url,
          width: 2400,
          height: 1260,
          alt: "OptimoRent — free Airbnb listing score against your market's measured comp set",
        },
      ],
    },
    twitter: {
      card: "summary_large_image" as const,
      images: [url],
    },
  };
}
