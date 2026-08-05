import type {
  AuditMarketEvidence,
  FreeAuditView,
  ResolvedListing,
  ScoringResult,
} from "@/lib/types";
import { getAirRoiProvider, AirRoiError } from "@/lib/airroi";
import { getScorer } from "@/lib/scoring";
import { cohortForBeds, getMarketBenchmark, toAuditEvidence } from "@/lib/market/benchmarks";
import { config } from "@/lib/config";

export interface AuditRunResult {
  resolved: ResolvedListing;
  scoring: ScoringResult;
  marketEvidence: AuditMarketEvidence | null;
}

/**
 * Transient upstream failures worth retrying: auth blips (a 401 from AirROI
 * self-resolved within minutes on 2026-08-05 and cost a real user their
 * audit), rate limits, 5xx, and network-layer errors. A 404/no-data is NOT
 * transient — retrying can't conjure a listing AirROI doesn't have.
 */
function isTransientDataError(e: unknown): boolean {
  if (e instanceof AirRoiError) {
    const s = e.status;
    return s === 401 || s === 403 || s === 429 || (s !== undefined && s >= 500);
  }
  return e instanceof TypeError; // fetch network failure
}

const RETRY_DELAYS_MS = [3_000, 8_000];

async function resolveWithRetry(airbnbUrl: string): Promise<ResolvedListing> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await getAirRoiProvider().resolve(airbnbUrl);
    } catch (e) {
      lastErr = e;
      if (!isTransientDataError(e) || attempt === RETRY_DELAYS_MS.length) throw e;
      console.warn(
        `[audit] transient market-data failure (attempt ${attempt + 1}), retrying:`,
        (e as Error).message,
      );
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
    }
  }
  throw lastErr; // unreachable, keeps TS happy
}

/**
 * Core audit pipeline — Build Pack §4 steps 2–5:
 *   resolve URL → AirROI listing + comps → attach Canggu market evidence →
 *   score with Claude. Persistence is layered on by the API route; this stays
 *   free of DB side-effects.
 *
 * The data-fetch stage retries transient upstream failures (only that stage:
 * re-running the Claude stage re-pays vision, and the scorer already has its
 * own parse retry + SDK-level retries).
 */
export async function runAudit(airbnbUrl: string): Promise<AuditRunResult> {
  const resolved = await resolveWithRetry(airbnbUrl);

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

/**
 * Kick the background job for an audit. On Netlify, invoke the background
 * function (15-min budget, 202-ack); on a persistent server (dev/next start)
 * run detached in-process. Shared by POST /api/audit and the retry route.
 */
export async function dispatchAuditJob(auditId: string, url: string): Promise<void> {
  if (process.env.NETLIFY === "true") {
    const base = process.env.URL ?? process.env.DEPLOY_PRIME_URL ?? config.appUrl;
    const res = await fetch(`${base}/.netlify/functions/audit-background`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Shared-secret guard so strangers can't trigger paid API work directly.
        "x-optirent-job-secret": config.reportLinkSecret,
      },
      body: JSON.stringify({ auditId, url }),
    });
    if (res.status >= 300) {
      throw new Error(`audit-background dispatch failed: HTTP ${res.status}`);
    }
  } else {
    // processAuditJob never throws — failures land on the audit row.
    void processAuditJob(auditId, url);
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
