import { config } from "@/lib/config";
import type { AuditStore } from "./store";
import { MemoryAuditStore } from "./memory";
import { SupabaseAuditStore } from "./supabase";

export type {
  AuditStore,
  CreateAuditInput,
  LeadInput,
  PaymentInput,
} from "./store";

let cached: AuditStore | null = null;

/**
 * Returns the configured audit store: Supabase when URL + service-role key are
 * present, otherwise the in-memory store (dev / keyless demo).
 */
export function getStore(): AuditStore {
  if (cached) return cached;
  cached =
    config.supabase.url && config.supabase.serviceRoleKey
      ? new SupabaseAuditStore()
      : new MemoryAuditStore();
  return cached;
}
