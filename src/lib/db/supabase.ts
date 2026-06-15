import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Audit } from "@/lib/types";
import { config } from "@/lib/config";
import type {
  AuditStore,
  CreateAuditInput,
  LeadInput,
  PaymentInput,
} from "./store";

/**
 * Supabase-backed audit store (Build Pack §5). Uses the service-role key —
 * server-side only. Tables created by supabase/migrations/0001_init.sql.
 */
export class SupabaseAuditStore implements AuditStore {
  private readonly db: SupabaseClient;

  constructor() {
    this.db = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: { persistSession: false },
    });
  }

  async createAudit(input: CreateAuditInput): Promise<Audit> {
    const s = input.scoring;
    const { data, error } = await this.db
      .from("audits")
      .insert({
        airbnb_url: input.airbnb_url,
        airroi_listing_id: input.airroi_listing_id,
        email: input.email,
        overall_score: s.overall_score,
        category_scores: s.category_scores,
        underpricing_idr: s.underpricing_idr,
        comp_count: s.comp_count,
        comp_basis: s.comp_basis,
        problem_count: s.problem_count,
        critical_count: s.critical_count,
        fixes: s.fixes,
        rewrites: s.rewrites,
        paid: false,
      })
      .select()
      .single();
    if (error) throw new Error(`createAudit failed: ${error.message}`);
    return data as Audit;
  }

  async getAudit(id: string): Promise<Audit | null> {
    const { data, error } = await this.db.from("audits").select().eq("id", id).maybeSingle();
    if (error) throw new Error(`getAudit failed: ${error.message}`);
    return (data as Audit) ?? null;
  }

  async markAuditPaid(id: string): Promise<void> {
    const { error } = await this.db.from("audits").update({ paid: true }).eq("id", id);
    if (error) throw new Error(`markAuditPaid failed: ${error.message}`);
  }

  async createLead(input: LeadInput): Promise<void> {
    const { error } = await this.db.from("leads").insert({
      email: input.email,
      airbnb_url: input.airbnb_url,
      score: input.score,
      underpricing: input.underpricing,
      problem_count: input.problem_count,
      source: input.source,
    });
    if (error) throw new Error(`createLead failed: ${error.message}`);
  }

  async recordPayment(input: PaymentInput): Promise<void> {
    const { error } = await this.db.from("payments").upsert(
      {
        audit_id: input.audit_id,
        amount_usd: input.amount_usd,
        provider: input.provider ?? "stripe",
        provider_ref: input.provider_ref ?? null,
        status: input.status ?? "pending",
      },
      { onConflict: "provider,provider_ref" },
    );
    if (error) throw new Error(`recordPayment failed: ${error.message}`);
    if ((input.status ?? "pending") === "paid") await this.markAuditPaid(input.audit_id);
  }
}
