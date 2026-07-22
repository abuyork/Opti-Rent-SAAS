import Anthropic from "@anthropic-ai/sdk";
import { config } from "@/lib/config";
import { extractJson } from "@/lib/scoring/validate";
import type { CohortStats, PlaybookFindings, ScannedListing } from "./types";

/**
 * Qualitative pattern pass: Claude studies the measured winners vs losers —
 * titles, description openings, amenities, metrics, and the actual COVER
 * IMAGES — and names the patterns the numbers can't (cover style, copywriting
 * angle, positioning). Every finding must cite its evidence.
 */

const patternsSystem = (marketTitle: string) => `You are OptimoRent's short-term-rental market analyst.
You receive, for the ${marketTitle} entire-home market:
1. DETERMINISTIC STATS — measured winners-vs-losers contrasts per bedroom
   cohort (top vs bottom viral-score quartile). These numbers are ground truth.
2. WINNERS and LOSERS — the actual listings: title, description opening,
   amenities, performance metrics, viral score.
3. COVER IMAGES for a subset, labelled "[winner]" or "[loser]" with cohort.

Extract what the highest-earning listings do differently, to eliminate
guesswork for hosts in ${marketTitle}. Anchor every pattern in THIS market's
guest context (who books here, what they filter for) — do not import
assumptions from other markets. Rules:
- Every finding MUST cite evidence: a stat from the data, named listings, or
  what you see in specific cover images. No generic Airbnb advice that could
  be written without this data.
- Contrast is the point: say what winners do AND losers fail to do.
- For covers: composition, subject (pool/facade/drone/interior/view), light
  (day/dusk/night), staging, people, text overlays — what separates the two groups you can SEE.
- top_actions: the 5-8 highest-leverage moves, ordered by expected impact,
  each concrete enough to act on this week.

Return STRICT JSON only:
{"cover_patterns":[{"finding":"...","evidence":"..."}],
 "title_patterns":[{"finding":"...","evidence":"..."}],
 "description_patterns":[{"finding":"...","evidence":"..."}],
 "amenity_patterns":[{"finding":"...","evidence":"..."}],
 "pricing_patterns":[{"finding":"...","evidence":"..."}],
 "top_actions":["...", "..."]}`;

function listingBrief(l: ScannedListing) {
  return {
    cohort: l.cohort,
    viral_score: l.viral_score,
    title: l.listing_name,
    description_opening: l.description.slice(0, 280),
    locality: l.locality,
    ttm_revpar: Math.round(l.ttm_revpar),
    ttm_occupancy: l.ttm_occupancy,
    ttm_avg_rate: Math.round(l.ttm_avg_rate),
    rating: l.rating_overall,
    num_reviews: l.num_reviews,
    guest_favorite: l.guest_favorite,
    instant_book: l.instant_book,
    photos_count: l.photos_count,
    amenities_sample: l.amenities.slice(0, 20),
  };
}

/** Covers to show: the extremes carry the visual signal. */
function pickCovers(winners: ScannedListing[], losers: ScannedListing[], max: number) {
  const withCover = (ls: ScannedListing[]) => ls.filter((l) => l.cover_photo_url);
  const nWin = Math.ceil(max * 0.6);
  return [
    ...withCover(winners).slice(0, nWin).map((l) => ({ l, tag: "winner" as const })),
    ...withCover(losers).slice(0, max - nWin).map((l) => ({ l, tag: "loser" as const })),
  ];
}

/**
 * Anthropic downloads url-source images itself and 400s the WHOLE request if
 * any single URL is dead (CDN photos rot as hosts re-upload). Pre-validate
 * each cover and drop unreachable ones instead of letting one stale URL kill
 * the pattern pass.
 */
type TaggedCover = { l: ScannedListing; tag: "winner" | "loser" };

async function validateCovers(covers: TaggedCover[]): Promise<TaggedCover[]> {
  const checks = await Promise.all(
    covers.map(async (c): Promise<TaggedCover | null> => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(c.l.cover_photo_url!, {
          method: "HEAD",
          signal: controller.signal,
        });
        clearTimeout(timer);
        return res.ok ? c : null;
      } catch {
        return null;
      }
    }),
  );
  const ok = checks.filter((c): c is TaggedCover => c !== null);
  if (ok.length < covers.length) {
    console.log(`[patterns] dropped ${covers.length - ok.length} dead cover URLs`);
  }
  return ok;
}

export async function extractPatterns(
  marketTitle: string,
  stats: CohortStats[],
  winners: ScannedListing[],
  losers: ScannedListing[],
  maxCoverImages = 16,
): Promise<PlaybookFindings> {
  const client = new Anthropic({ apiKey: config.claude.apiKey });

  const content: Anthropic.ContentBlockParam[] = [];
  const covers = await validateCovers(pickCovers(winners, losers, maxCoverImages));
  for (const { l, tag } of covers) {
    content.push({
      type: "text",
      text: `Cover [${tag}] ${l.cohort} "${l.listing_name.slice(0, 60)}" (viral ${l.viral_score}):`,
    });
    content.push({ type: "image", source: { type: "url", url: l.cover_photo_url! } });
  }
  content.push({
    type: "text",
    text:
      `DETERMINISTIC STATS (ground truth):\n${JSON.stringify(stats)}\n\n` +
      `WINNERS (top quartile by viral score):\n${JSON.stringify(winners.map(listingBrief))}\n\n` +
      `LOSERS (bottom quartile):\n${JSON.stringify(losers.map(listingBrief))}`,
  });

  const msg = await client.messages.create({
    model: config.claude.model,
    // Findings for 6 sections + evidence run long; a truncated reply is
    // unparseable JSON, so leave generous headroom.
    max_tokens: 16384,
    system: patternsSystem(marketTitle),
    messages: [{ role: "user", content }],
  });

  const raw = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const parsed = extractJson(raw) as Partial<PlaybookFindings>;
  const arr = (v: unknown) => (Array.isArray(v) ? v : []);
  return {
    cover_patterns: arr(parsed.cover_patterns),
    title_patterns: arr(parsed.title_patterns),
    description_patterns: arr(parsed.description_patterns),
    amenity_patterns: arr(parsed.amenity_patterns),
    pricing_patterns: arr(parsed.pricing_patterns),
    top_actions: arr(parsed.top_actions),
  };
}
