import Image from "next/image";

/**
 * Identifies the audited listing on the result page and PDF report: hero photo
 * thumbnail, listing title, and a short link to the listing on Airbnb.
 *
 * The photo goes through next/image so it is served from OUR origin — raw
 * a0.muscache.com images get blocked by ad/privacy blockers on some devices
 * (manager QA 2026-07-16: photo invisible on his machine, fine elsewhere).
 */
export function ListingIdentity({
  title,
  photo,
  airbnbUrl,
}: {
  title: string | null;
  photo: string | null;
  airbnbUrl: string;
}) {
  // Short, canonical link: strip check-in dates and tracking params.
  const roomId = airbnbUrl.match(/\/rooms\/(?:plus\/)?(\d+)/)?.[1] ?? null;
  const canonicalUrl = roomId ? `https://www.airbnb.com/rooms/${roomId}` : airbnbUrl;

  return (
    <div className="mt-3 flex items-center gap-3">
      {photo && (
        <Image
          src={photo}
          alt={title ?? "Listing hero photo"}
          width={112}
          height={112}
          className="h-14 w-14 shrink-0 rounded-lg border border-dove object-cover"
        />
      )}
      <div className="min-w-0">
        {title && (
          <div className="truncate text-sm font-medium text-ink">{title}</div>
        )}
        <a
          href={canonicalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[11px] text-fog underline decoration-dove underline-offset-2 hover:text-ink hover:decoration-ink"
        >
          View your listing on Airbnb ↗
        </a>
      </div>
    </div>
  );
}
