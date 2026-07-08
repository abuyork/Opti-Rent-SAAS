/**
 * Identifies the audited listing on the result page and PDF report: hero photo
 * thumbnail, listing title, and the actual Airbnb URL that was analyzed.
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
  return (
    <div className="mt-3 flex items-center gap-3">
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          alt={title ?? "Listing hero photo"}
          className="h-14 w-14 shrink-0 rounded-lg border border-brand-line object-cover"
        />
      )}
      <div className="min-w-0">
        {title && (
          <div className="truncate text-sm font-semibold text-brand-navy">{title}</div>
        )}
        <a
          href={airbnbUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate text-xs text-brand-teal underline underline-offset-2"
        >
          {airbnbUrl}
        </a>
      </div>
    </div>
  );
}
