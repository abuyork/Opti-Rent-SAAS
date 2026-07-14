import type { Audit, AuditMarketEvidence, ScoringResult } from "@/lib/types";

/** Creates the instant 'processing' row (before any scoring exists). */
export interface PendingAuditInput {
  airbnb_url: string;
  airroi_listing_id: string | null;
  email: string;
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
  getAudit(id: string): Promise<Audit | null>;
  markAuditPaid(id: string): Promise<void>;
  createLead(input: LeadInput): Promise<void>;
  recordPayment(input: PaymentInput): Promise<void>;
}
