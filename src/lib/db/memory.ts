import type { Audit } from "@/lib/types";
import type {
  AuditStore,
  CreateAuditInput,
  LeadInput,
  PaymentInput,
} from "./store";

/**
 * In-memory audit store for development / mock mode. Data does not survive a
 * server restart — fine for the no-credentials demo path. Swapped for the
 * Supabase adapter once keys are configured.
 *
 * Held on globalThis so it survives Next.js dev hot-reloads within one process.
 */
type Store = { audits: Map<string, Audit> };

const g = globalThis as unknown as { __optirentStore?: Store };
const store: Store = (g.__optirentStore ??= { audits: new Map() });

export class MemoryAuditStore implements AuditStore {
  async createAudit(input: CreateAuditInput): Promise<Audit> {
    const audit: Audit = {
      id: crypto.randomUUID(),
      airbnb_url: input.airbnb_url,
      airroi_listing_id: input.airroi_listing_id,
      email: input.email,
      created_at: new Date().toISOString(),
      overall_score: input.scoring.overall_score,
      category_scores: input.scoring.category_scores,
      underpricing_idr: input.scoring.underpricing_idr,
      comp_count: input.scoring.comp_count,
      comp_basis: input.scoring.comp_basis,
      problem_count: input.scoring.problem_count,
      critical_count: input.scoring.critical_count,
      fixes: input.scoring.fixes,
      rewrites: input.scoring.rewrites,
      paid: false,
    };
    store.audits.set(audit.id, audit);
    return audit;
  }

  async getAudit(id: string): Promise<Audit | null> {
    return store.audits.get(id) ?? null;
  }

  async markAuditPaid(id: string): Promise<void> {
    const a = store.audits.get(id);
    if (a) a.paid = true;
  }

  async createLead(_input: LeadInput): Promise<void> {
    // No-op in memory mode (leads are an analytics/marketing concern).
  }

  async recordPayment(input: PaymentInput): Promise<void> {
    if (input.status === "paid") await this.markAuditPaid(input.audit_id);
  }
}
