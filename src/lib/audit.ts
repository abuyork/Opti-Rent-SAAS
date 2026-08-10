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
import { hasFullReportAccess } from "@/lib/access";

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
  // listing_nightly_rate is stamped here, not in toAuditEvidence: the benchmark
  // knows the market, only this pipeline knows the listing. See its type doc.
  const marketEvidence = benchmark
    ? {
        ...toAuditEvidence(benchmark),
        listing_nightly_rate: resolved.listing.nightly_rate ?? null,
      }
    : null;

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
 *
 * COST CONTROL: if the same listing already has a completed audit inside the
 * reuse window (24h default), its result is copied instead of re-running the
 * pipeline — a repeat audit re-paid AirROI AND Claude vision (~$0.55) in
 * full before this. The requester still gets their own row, email, and
 * paywall state; only the scoring work is shared.
 */
export async function processAuditJob(auditId: string, airbnbUrl: string): Promise<void> {
  const { getStore } = await import("@/lib/db");
  const store = getStore();
  try {
    const pending = await store.getAudit(auditId);
    if (pending?.airroi_listing_id) {
      const since = new Date(
        Date.now() - config.limits.auditReuseHours * 3_600_000,
      ).toISOString();
      const source = await store.findRecentCompletedByListing(
        pending.airroi_listing_id,
        since,
        auditId,
      );
      if (source) {
        console.log(
          `[audit] ${auditId} reusing ${source.id} (same listing scored within ${config.limits.auditReuseHours}h)`,
        );
        await store.completeAudit(auditId, {
          airroi_listing_id: source.airroi_listing_id,
          listing_title: source.listing_title,
          listing_photo: source.listing_photo,
          scoring: {
            overall_score: source.overall_score,
            category_scores: source.category_scores,
            underpricing_idr: source.underpricing_idr,
            comp_count: source.comp_count,
            comp_basis: source.comp_basis,
            problem_count: source.problem_count,
            critical_count: source.critical_count,
            fixes: source.fixes,
            rewrites: source.rewrites,
          },
          market_evidence: source.market_evidence,
        });
        await sendReadyEmail(store, auditId, source.listing_title);
        return;
      }
    }

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
    await sendReadyEmail(store, auditId, resolved.listing.title || null);
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

/** "Report ready" email (manager ask 2026-07-14). Fire-and-forget within the
 * job: an email failure must never fail a completed audit. */
async function sendReadyEmail(
  store: import("./db/store").AuditStore,
  auditId: string,
  listingTitle: string | null,
): Promise<void> {
  const audit = await store.getAudit(auditId);
  if (!audit?.email) return;
  const { sendReportReadyEmail } = await import("@/lib/email");
  await sendReportReadyEmail({
    to: audit.email,
    auditId,
    listingTitle,
    includePdfLink: hasFullReportAccess(audit),
  });
}

/**
 * Kick the background job for an audit. Shared by POST /api/audit and the
 * retry route.
 *
 * Dispatch is SELF-DETECTING, not env-flag-detecting: it tries the Netlify
 * background function over HTTP first and falls back to detached in-process
 * execution only in dev, or when the function endpoint genuinely does not
 * exist (404 — e.g. plain `next start` off Netlify). The old gate was
 * `process.env.NETLIFY === "true"`, and when a Netlify runtime rebuild
 * stopped exposing that variable (2026-08-05), every production audit
 * silently took the in-process path — which a serverless lambda freezes the
 * moment the response returns, leaving rows stuck in 'processing' forever.
 * An in-process fallback on a frozen lambda is strictly worse than an error,
 * so any other dispatch failure now throws and the user gets a truthful
 * retryable message instead of an infinite spinner.
 */
export async function dispatchAuditJob(auditId: string, url: string): Promise<void> {
  // Local dev server: persistent process, no functions runtime — run inline.
  if (process.env.NODE_ENV === "development") {
    void processAuditJob(auditId, url); // never throws; failures land on the row
    return;
  }

  const base = process.env.URL ?? process.env.DEPLOY_PRIME_URL ?? config.appUrl;
  let res: Response;
  try {
    res = await fetch(`${base}/.netlify/functions/audit-background`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Shared-secret guard so strangers can't trigger paid API work directly.
        "x-optirent-job-secret": config.reportLinkSecret,
      },
      body: JSON.stringify({ auditId, url }),
    });
  } catch (e) {
    throw new Error(`audit-background dispatch failed: ${(e as Error).message}`);
  }

  // AWS sets this in every Lambda runtime — if present we are serverless and
  // must NEVER fall back to in-process, even on a 404 (a missing function
  // bundle should fail loudly, not freeze silently).
  const onLambda = Boolean(
    process.env.AWS_LAMBDA_FUNCTION_NAME ?? process.env.LAMBDA_TASK_ROOT,
  );
  if (res.status === 404 && !onLambda) {
    // No background function at this origin → persistent non-Netlify server
    // (`next start`): safe to run detached in-process.
    void processAuditJob(auditId, url);
    return;
  }
  if (res.status >= 300) {
    throw new Error(`audit-background dispatch failed: HTTP ${res.status}`);
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
