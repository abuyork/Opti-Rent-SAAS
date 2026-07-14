import type { Audit, CategoryScores } from "@/lib/types";
import type {
  AuditStore,
  CompleteAuditInput,
  LeadInput,
  PaymentInput,
  PendingAuditInput,
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

const EMPTY_SCORES: CategoryScores = {
  photos: 0,
  title: 0,
  pricing_position: 0,
  description: 0,
  amenity_gap: 0,
  reviews: 0,
  risk_rules: 0,
};

export class MemoryAuditStore implements AuditStore {
  async createPendingAudit(input: PendingAuditInput): Promise<Audit> {
    const audit: Audit = {
      id: crypto.randomUUID(),
      status: "processing",
      error_message: null,
      airbnb_url: input.airbnb_url,
      airroi_listing_id: input.airroi_listing_id,
      listing_title: null,
      listing_photo: null,
      email: input.email,
      created_at: new Date().toISOString(),
      overall_score: 0,
      category_scores: { ...EMPTY_SCORES },
      underpricing_idr: 0,
      comp_count: 0,
      comp_basis: "",
      problem_count: 0,
      critical_count: 0,
      fixes: [],
      rewrites: {
        title: { before: "", after: "" },
        description_opening: { before: "", after: "" },
      },
      market_evidence: null,
      paid: false,
    };
    store.audits.set(audit.id, audit);
    return audit;
  }

  async completeAudit(id: string, input: CompleteAuditInput): Promise<void> {
    const a = store.audits.get(id);
    if (!a) return;
    const s = input.scoring;
    Object.assign(a, {
      status: "complete",
      error_message: null,
      airroi_listing_id: input.airroi_listing_id,
      listing_title: input.listing_title,
      listing_photo: input.listing_photo,
      overall_score: s.overall_score,
      category_scores: s.category_scores,
      underpricing_idr: s.underpricing_idr,
      comp_count: s.comp_count,
      comp_basis: s.comp_basis,
      problem_count: s.problem_count,
      critical_count: s.critical_count,
      fixes: s.fixes,
      rewrites: s.rewrites,
      market_evidence: input.market_evidence,
    });
  }

  async failAudit(id: string, errorMessage: string): Promise<void> {
    const a = store.audits.get(id);
    if (a) Object.assign(a, { status: "failed", error_message: errorMessage });
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
