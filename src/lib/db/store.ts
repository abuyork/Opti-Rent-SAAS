import type { Audit, AuditMarketEvidence, ScoringResult } from "@/lib/types";

/** Creates the instant 'processing' row (before any scoring exists). */
export interface PendingAuditInput {
  airbnb_url: string;
  airroi_listing_id: string | null;
  email: string;
  /** Requester IP for rate limiting; null when the header is absent. */
  client_ip?: string | null;
}

/** How many audits an email / IP created since `sinceIso` (rate limiting). */
export interface RecentAuditCounts {
  byEmail: number;
  byIp: number;
}

/** Fills a processing row in once the background scorer finishes. */
export interface CompleteAuditInput {
  airroi_listing_id: string | null;
  listing_title: string | null;
  listing_photo: string | null;
  scoring: ScoringResult;
  market_evidence: AuditMarketEvidence | null;
}

export interface LeadInput {
  email: string;
  airbnb_url?: string;
  score?: number;
  underpricing?: number;
  problem_count?: number;
  source?: string;
}

export interface PaymentInput {
  audit_id: string;
  amount_usd: number; // cents
  provider?: string;
  provider_ref?: string | null;
  status?: "pending" | "paid" | "failed" | "refunded";
}

/**
 * Persistence contract for audits, leads and payments (Build Pack §5).
 * Audits are async (Netlify's function cap vs 30-70s scoring): a pending row is
 * created instantly, then completed or failed by the background job.
 * Implemented by an in-memory adapter (dev) and a Supabase adapter (prod).
 */
export interface AuditStore {
  createPendingAudit(input: PendingAuditInput): Promise<Audit>;
  completeAudit(id: string, input: CompleteAuditInput): Promise<void>;
  failAudit(id: string, errorMessage: string): Promise<void>;
  /** Flip a failed row back to 'processing' so its job can be re-run in place. */
  markProcessing(id: string): Promise<void>;
  getAudit(id: string): Promise<Audit | null>;
  markAuditPaid(id: string): Promise<void>;
  createLead(input: LeadInput): Promise<void>;
  recordPayment(input: PaymentInput): Promise<void>;
  /**
   * Latest COMPLETED audit of the same listing since `sinceIso`, excluding
   * `excludeId` (the row being processed). Powers repeat-audit reuse: serving
   * a fresh result from the stored one skips both paid API calls.
   */
  findRecentCompletedByListing(
    airroiListingId: string,
    sinceIso: string,
    excludeId: string,
  ): Promise<Audit | null>;
  /** Creation counts for rate limiting; ip null → byIp is 0. */
  countRecentAudits(
    email: string,
    clientIp: string | null,
    sinceIso: string,
  ): Promise<RecentAuditCounts>;
}
