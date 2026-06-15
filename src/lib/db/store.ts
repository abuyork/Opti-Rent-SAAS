import type { Audit, ScoringResult } from "@/lib/types";

export interface CreateAuditInput {
  airbnb_url: string;
  airroi_listing_id: string | null;
  email: string;
  scoring: ScoringResult;
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
 * Implemented by an in-memory adapter (dev) and a Supabase adapter (prod).
 */
export interface AuditStore {
  createAudit(input: CreateAuditInput): Promise<Audit>;
  getAudit(id: string): Promise<Audit | null>;
  markAuditPaid(id: string): Promise<void>;
  createLead(input: LeadInput): Promise<void>;
  recordPayment(input: PaymentInput): Promise<void>;
}
