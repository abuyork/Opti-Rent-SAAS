import type {
  AuditMarketEvidence,
  FreeAuditView,
  ResolvedListing,
  ScoringResult,
} from "@/lib/types";
import { getAirRoiProvider } from "@/lib/airroi";
import { getScorer } from "@/lib/scoring";
import { cohortForBeds, getMarketBenchmark, toAuditEvidence } from "@/lib/market/benchmarks";

export interface AuditRunResult {
  resolved: ResolvedListing;
  scoring: ScoringResult;
  marketEvidence: AuditMarketEvidence | null;
}

/**
 * Core audit pipeline — Build Pack §4 steps 2–5:
 *   resolve URL → AirROI listing + comps → attach Canggu market evidence →
 *   score with Claude. Persistence is layered on by the API route; this stays
 *   free of DB side-effects.
 */
export async function runAudit(airbnbUrl: string): Promise<AuditRunResult> {
  const resolved = await getAirRoiProvider().resolve(airbnbUrl);

  // Attach measured winner benchmarks for the listing's cohort — for any market
  // we've actually scanned (Canggu, Dubai, London). Unscanned market → no evidence.
  const benchmark = resolved.market_key
    ? getMarketBenchmark(resolved.market_key, cohortForBeds(resolved.listing.beds))
    : null;
  const marketEvidence = benchmark ? toAuditEvidence(benchmark) : null;

  const scoring = await getScorer().score({
    listing: resolved.listing,
    comps: resolved.comps,
    micro_market: resolved.micro_market,
    target_guest: resolved.target_guest,
    market_evidence: marketEvidence ?? undefined,
  });
  return { resolved, scoring, marketEvidence };
}

/** Reduce a full scoring result to the FREE-tier view (no fixes/rewrites). §1, §4.6 */
export function toFreeView(id: string, scoring: ScoringResult, paid: boolean): FreeAuditView {
  return {
    id,
    overall_score: scoring.overall_score,
    underpricing_idr: scoring.underpricing_idr,
    comp_count: scoring.comp_count,
    comp_basis: scoring.comp_basis,
    problem_count: scoring.problem_count,
    critical_count: scoring.critical_count,
    paid,
  };
}
