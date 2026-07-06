import type { FreeAuditView, ResolvedListing, ScoringResult } from "@/lib/types";
import { getAirRoiProvider } from "@/lib/airroi";
import { getScorer } from "@/lib/scoring";

export interface AuditRunResult {
  resolved: ResolvedListing;
  scoring: ScoringResult;
}

/**
 * Core audit pipeline — Build Pack §4 steps 2–5:
 *   resolve URL → AirROI listing + comps → score with Claude.
 * Persistence (audits/leads rows) is layered on by the API route once Supabase
 * is configured; this function stays pure and side-effect free.
 */
export async function runAudit(airbnbUrl: string): Promise<AuditRunResult> {
  const resolved = await getAirRoiProvider().resolve(airbnbUrl);
  const scoring = await getScorer().score({
    listing: resolved.listing,
    comps: resolved.comps,
    micro_market: resolved.micro_market,
    target_guest: resolved.target_guest,
  });
  return { resolved, scoring };
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
