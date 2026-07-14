import type { AuditMarketEvidence } from "@/lib/types";

const pct = (v: number) => `${Math.round(v * 100)}%`;

const MARKET_TITLES: Record<string, string> = {
  "greater-canggu": "Greater Canggu",
  dubai: "Dubai",
  london: "London",
};
const marketTitle = (key: string) => MARKET_TITLES[key] ?? key;

/**
 * Visual reference section: the real top-earning covers in the owner's exact
 * Canggu bedroom cohort, plus the measured winner benchmarks. This is the
 * "here's what works, with proof" panel — evidence, not opinion.
 */
export function MarketEvidence({ evidence: e }: { evidence: AuditMarketEvidence }) {
  const amenities = e.top_amenities.slice(0, 5);

  return (
    <section className="mt-10">
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-widest text-brand-muted">
        What wins in your market — {e.cohort} listings in {marketTitle(e.market)}
      </h2>
      <p className="mb-4 text-sm text-brand-muted">
        Measured from {e.sample_size} listings. The top earners in your size class
        share these traits — compare yourself against them, not guesswork.
      </p>

      {/* Visual references: real winning covers */}
      {e.winner_covers.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {e.winner_covers.map((c) => (
            <figure
              key={c.cover_photo_url}
              className="pdf-block overflow-hidden rounded-lg border border-brand-line"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.cover_photo_url}
                alt={`Winning cover: ${c.listing_name}`}
                className="h-40 w-full object-cover"
                loading="lazy"
              />
              <figcaption className="px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="rounded bg-brand-teal/10 px-1.5 py-0.5 text-xs font-semibold text-brand-teal">
                    Viral {c.viral_score}
                  </span>
                  <span className="text-xs text-brand-muted">{pct(c.ttm_occupancy)} booked</span>
                </div>
                <p className="mt-1 truncate text-xs text-brand-ink" title={c.listing_name}>
                  {c.listing_name}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {/* Measured benchmarks */}
      <div className="mt-4 rounded-lg bg-brand-card px-4 py-3 text-sm text-brand-ink">
        <p className="mb-2 font-semibold text-brand-navy">
          What the winners do (measured, not guessed):
        </p>
        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          <li>
            📸 <b>{e.winner_median_photos} photos</b> (weak listings: {e.loser_median_photos})
          </li>
          <li>
            ✍️ <b>{e.winner_median_description_chars.toLocaleString()}-char descriptions</b>{" "}
            (weak listings: {e.loser_median_description_chars})
          </li>
          <li>
            🏷️ Titles ~<b>{e.winner_median_title_chars} chars</b>
            {e.title_keywords.length > 0 && (
              <> · words that win: {e.title_keywords.slice(0, 5).join(", ")}</>
            )}
          </li>
          <li>
            ⭐ <b>{pct(e.winner_superhost_share)} Superhost</b>,{" "}
            {pct(e.winner_guest_favorite_share)} Guest Favorite
          </li>
        </ul>
        {amenities.length > 0 && (
          <p className="mt-2 text-xs text-brand-muted">
            Amenities winners tag that laggards don&apos;t:{" "}
            {amenities
              .map((a) => `${a.amenity} (${pct(a.winner_share)} vs ${pct(a.loser_share)})`)
              .join(" · ")}
          </p>
        )}
      </div>
    </section>
  );
}
