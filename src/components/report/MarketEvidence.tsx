import Image from "next/image";
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
      className="font-medium text-ink underline decoration-dove underline-offset-2 hover:decoration-ink"
    >
      {c.listing_name} ↗
    </a>
  ) : (
    <span className="font-medium text-ink">{c.listing_name}</span>
  );

  return (
    <div className="pdf-block flex flex-col overflow-hidden rounded-2xl border border-dove sm:flex-row">
      {/* next/image serves covers from our origin — direct muscache.com images
          get blocked by ad/privacy blockers on some devices. */}
      <div className="relative h-44 w-full sm:h-auto sm:w-56 sm:shrink-0">
        <Image
          src={c.cover_photo_url}
          alt={`Winning cover: ${c.listing_name}`}
          fill
          sizes="(min-width: 640px) 224px, 100vw"
          className="object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col justify-center gap-1.5 px-5 py-4">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0 rounded-full bg-sand px-2 py-0.5 font-mono text-[11px] font-medium text-ink">
            #{rank} · Viral {c.viral_score}
          </span>
          <p className="text-sm leading-snug">{title}</p>
        </div>
        <p className="font-mono text-[11px] uppercase tracking-wide text-pewter">
          {c.locality}
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink">
          <span>
            <b className="font-medium">{formatMoney(currency, c.ttm_revpar)}</b>
            <span className="text-fog"> per available night</span>
          </span>
          <span>
            <b className="font-medium">{pct(c.ttm_occupancy)}</b>
            <span className="text-fog"> booked</span>
          </span>
          {c.rating_overall != null && (
            <span>
              <b className="font-medium">{c.rating_overall}★</b>
              <span className="text-fog"> ({c.num_reviews ?? 0} reviews)</span>
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
    <section className="mt-12">
      <h2 className="mb-1 text-2xl font-normal tracking-[-0.025em] text-ink">
        What wins in your market: {e.cohort} in {marketTitle(e.market)}
      </h2>
      <p className="mb-4 text-sm leading-relaxed text-fog">
        Measured from {e.sample_size} listings in your size class. These are the
        top earners your listing competes with.
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
      <div className="mt-4 rounded-2xl bg-cream px-6 py-5 text-sm text-ink">
        <p className="mb-3 font-medium text-ink">What the winners have in common</p>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <li>
            <span className="font-mono text-[11px] uppercase tracking-wide text-pewter">
              Photos{" "}
            </span>
            <b className="font-medium">{e.winner_median_photos}</b>{" "}
            <span className="text-fog">(weak listings: {e.loser_median_photos})</span>
          </li>
          <li>
            <span className="font-mono text-[11px] uppercase tracking-wide text-pewter">
              Description{" "}
            </span>
            <b className="font-medium">
              {e.winner_median_description_chars.toLocaleString()} chars
            </b>{" "}
            <span className="text-fog">
              (weak listings: {e.loser_median_description_chars})
            </span>
          </li>
          <li>
            <span className="font-mono text-[11px] uppercase tracking-wide text-pewter">
              Title{" "}
            </span>
            around <b className="font-medium">{e.winner_median_title_chars} chars</b>
            {e.title_keywords.length > 0 && (
              <span className="text-fog">
                {" "}
                · words that win: {e.title_keywords.slice(0, 5).join(", ")}
              </span>
            )}
          </li>
          <li>
            <span className="font-mono text-[11px] uppercase tracking-wide text-pewter">
              Status{" "}
            </span>
            <b className="font-medium">{pct(e.winner_superhost_share)} Superhost</b>,{" "}
            {pct(e.winner_guest_favorite_share)} Guest Favorite
          </li>
        </ul>
        {amenities.length > 0 && (
          <p className="mt-3 text-xs leading-relaxed text-fog">
            Amenities winners list that weak listings miss:{" "}
            {amenities
              .map((a) => `${a.amenity} (${pct(a.winner_share)} vs ${pct(a.loser_share)})`)
              .join(" · ")}
          </p>
        )}
      </div>
    </section>
  );
}
