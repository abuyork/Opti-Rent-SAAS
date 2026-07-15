import type { AuditMarketEvidence, MarketCoverExample } from "@/lib/types";
import { formatMoney } from "@/lib/format";

const pct = (v: number) => `${Math.round(v * 100)}%`;

const MARKET_TITLES: Record<string, string> = {
  "greater-canggu": "Greater Canggu",
  dubai: "Dubai",
  london: "London",
};
const marketTitle = (key: string) => MARKET_TITLES[key] ?? key;

/** One winner: photo + full title (active Airbnb link) + its real numbers. */
function WinnerRow({
  c,
  rank,
  currency,
}: {
  c: MarketCoverExample;
  rank: number;
  currency: string;
}) {
  const airbnbUrl = c.listing_id ? `https://www.airbnb.com/rooms/${c.listing_id}` : null;
  const title = airbnbUrl ? (
    <a
      href={airbnbUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-brand-navy underline decoration-brand-line underline-offset-2 hover:text-brand-teal hover:decoration-brand-teal"
    >
      {c.listing_name} ↗
    </a>
  ) : (
    <span className="font-semibold text-brand-navy">{c.listing_name}</span>
  );

  return (
    <div className="pdf-block flex flex-col overflow-hidden rounded-lg border border-brand-line sm:flex-row">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={c.cover_photo_url}
        alt={`Winning cover: ${c.listing_name}`}
        className="h-44 w-full object-cover sm:h-auto sm:w-56 sm:shrink-0"
        loading="lazy"
      />
      <div className="flex flex-1 flex-col justify-center gap-1.5 px-4 py-3">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0 rounded bg-brand-teal/10 px-1.5 py-0.5 text-xs font-semibold text-brand-teal">
            #{rank} · Viral {c.viral_score}
          </span>
          <p className="text-sm leading-snug">{title}</p>
        </div>
        <p className="text-xs text-brand-muted">{c.locality}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-brand-ink">
          <span>
            💰 <b>{formatMoney(currency, c.ttm_revpar)}</b>
            <span className="text-brand-muted"> /available night</span>
          </span>
          <span>
            📅 <b>{pct(c.ttm_occupancy)}</b>
            <span className="text-brand-muted"> booked</span>
          </span>
          {c.rating_overall != null && (
            <span>
              ⭐ <b>{c.rating_overall}</b>
              <span className="text-brand-muted"> ({c.num_reviews ?? 0} reviews)</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Visual reference section: the real top-earning covers in the owner's exact
 * bedroom cohort, plus the measured winner benchmarks. This is the
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

      {/* The winning set: one full-width row per winner, each an active Airbnb
          link with its real numbers (manager feedback 2026-07-14). */}
      {e.winner_covers.length > 0 && (
        <div className="flex flex-col gap-3">
          {e.winner_covers.map((c, i) => (
            <WinnerRow key={c.cover_photo_url} c={c} rank={i + 1} currency={e.currency ?? "IDR"} />
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
