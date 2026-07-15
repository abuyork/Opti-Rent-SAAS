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

/**
 * Full background job for one audit: run the pipeline, then complete or fail
 * the pending row. Never throws — every failure lands on the row so the
 * polling UI always has something truthful to show. Shared by the dev
 * in-process runner and the Netlify background function.
 */
export async function processAuditJob(auditId: string, airbnbUrl: string): Promise<void> {
  const { getStore } = await import("@/lib/db");
  const store = getStore();
  try {
    const { resolved, scoring, marketEvidence } = await runAudit(airbnbUrl);
    const heroPhoto =
      resolved.listing.photos.find((p) => /^https?:\/\//i.test(p)) ?? null;
    await store.completeAudit(auditId, {
      airroi_listing_id: resolved.airroi_listing_id,
      listing_title: resolved.listing.title || null,
      listing_photo: heroPhoto,
      scoring,
      market_evidence: marketEvidence,
    });

    // "Report ready" email (manager ask 2026-07-14). Fire-and-forget within the
    // job: an email failure must never fail a completed audit.
    const audit = await store.getAudit(auditId);
    if (audit?.email) {
      const { sendReportReadyEmail } = await import("@/lib/email");
      const { config } = await import("@/lib/config");
      await sendReportReadyEmail({
        to: audit.email,
        auditId,
        listingTitle: resolved.listing.title || null,
        includePdfLink: audit.paid || config.testingShowFullReport,
      });
    }
  } catch (e) {
    console.error(`[processAuditJob] audit ${auditId} failed:`, e);
    const { AirRoiError } = await import("@/lib/airroi");
    const message =
      e instanceof AirRoiError
        ? e.userMessage
        : "We couldn't finish analyzing this listing. Please try again.";
    try {
      await store.failAudit(auditId, message);
    } catch (persistErr) {
      console.error(`[processAuditJob] failAudit also failed:`, persistErr);
    }
  }
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
