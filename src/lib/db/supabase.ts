import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Audit } from "@/lib/types";
import { config } from "@/lib/config";
import type {
  AuditStore,
  CompleteAuditInput,
  LeadInput,
  PaymentInput,
  PendingAuditInput,
  RecentAuditCounts,
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

  async createPendingAudit(input: PendingAuditInput): Promise<Audit> {
    const { data, error } = await this.db
      .from("audits")
      .insert({
        status: "processing",
        airbnb_url: input.airbnb_url,
        airroi_listing_id: input.airroi_listing_id,
        email: input.email,
        client_ip: input.client_ip ?? null,
        paid: false,
      })
      .select()
      .single();
    if (error) throw new Error(`createPendingAudit failed: ${error.message}`);
    return data as Audit;
  }

  async completeAudit(id: string, input: CompleteAuditInput): Promise<void> {
    const s = input.scoring;
    const { error } = await this.db
      .from("audits")
      .update({
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
      })
      .eq("id", id);
    if (error) throw new Error(`completeAudit failed: ${error.message}`);
  }

  async failAudit(id: string, errorMessage: string): Promise<void> {
    const { error } = await this.db
      .from("audits")
      .update({ status: "failed", error_message: errorMessage })
      .eq("id", id);
    if (error) throw new Error(`failAudit failed: ${error.message}`);
  }

  async markProcessing(id: string): Promise<void> {
    const { error } = await this.db
      .from("audits")
      .update({ status: "processing", error_message: null })
      .eq("id", id);
    if (error) throw new Error(`markProcessing failed: ${error.message}`);
  }

  async getAudit(id: string): Promise<Audit | null> {
    const { data, error } = await this.db.from("audits").select().eq("id", id).maybeSingle();
    if (error) {
      // 22P02 = invalid uuid syntax. The id comes straight from the public
      // /result and /report URLs, so a mangled link must 404, not 500.
      if (error.code === "22P02") return null;
      throw new Error(`getAudit failed: ${error.message}`);
    }
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

  async findRecentCompletedByListing(
    airroiListingId: string,
    sinceIso: string,
    excludeId: string,
  ): Promise<Audit | null> {
    const { data, error } = await this.db
      .from("audits")
      .select()
      .eq("airroi_listing_id", airroiListingId)
      .eq("status", "complete")
      .gte("created_at", sinceIso)
      .neq("id", excludeId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`findRecentCompletedByListing failed: ${error.message}`);
    return (data as Audit) ?? null;
  }

  async countRecentAudits(
    email: string,
    clientIp: string | null,
    sinceIso: string,
  ): Promise<RecentAuditCounts> {
    const byEmailQ = this.db
      .from("audits")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .gte("created_at", sinceIso);
    const byIpQ = clientIp
      ? this.db
          .from("audits")
          .select("id", { count: "exact", head: true })
          .eq("client_ip", clientIp)
          .gte("created_at", sinceIso)
      : null;
    const [byEmail, byIp] = await Promise.all([byEmailQ, byIpQ ?? Promise.resolve(null)]);
    if (byEmail.error) throw new Error(`countRecentAudits failed: ${byEmail.error.message}`);
    if (byIp?.error) throw new Error(`countRecentAudits failed: ${byIp.error.message}`);
    return { byEmail: byEmail.count ?? 0, byIp: byIp?.count ?? 0 };
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
