import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "@/lib/config";
import { referralCookieShape } from "@/lib/ambassadors";

/**
 * Server-side ambassador registry, backed by the `ambassadors` Supabase table
 * (migration 0009) so adding an ambassador is a Table Editor row — live
 * immediately, no deploy. Rows: slug (PK), name (shown in the landing
 * kicker), active (uncheck to retire a link without losing the slug on past
 * sales). Service-role only, like every other table.
 *
 * Kept OUT of lib/ambassadors.ts on purpose: that module is imported by the
 * edge proxy and client analytics, which must not pull in supabase-js or the
 * service key.
 */
export interface Ambassador {
  slug: string;
  name: string;
}

/** Keyless dev/demo fallback (no Supabase env): mirrors the seeded table. */
const FALLBACK: Record<string, string> = { gusde: "Gusde" };

let cached: SupabaseClient | null = null;
function db(): SupabaseClient | null {
  if (!config.supabase.url || !config.supabase.serviceRoleKey) return null;
  cached ??= createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: { persistSession: false },
  });
  return cached;
}

/** Active ambassador for a slug (URL segment or cookie value); null otherwise. */
export async function getAmbassador(slug: string | null | undefined): Promise<Ambassador | null> {
  const clean = referralCookieShape(slug);
  if (!clean) return null;
  const client = db();
  if (!client) {
    return FALLBACK[clean] ? { slug: clean, name: FALLBACK[clean] } : null;
  }
  const { data, error } = await client
    .from("ambassadors")
    .select("slug,name")
    .eq("slug", clean)
    .eq("active", true)
    .maybeSingle();
  if (error) {
    // Attribution is best-effort: a registry hiccup must never block an audit
    // or a checkout, so log and treat as not-referred.
    console.error(`[ambassadors] lookup failed for "${clean}": ${error.message}`);
    return null;
  }
  return data ? { slug: data.slug, name: data.name } : null;
}

/**
 * Registry-validated referral slug from a cookie value; null when absent,
 * malformed, unknown, or retired. The only gate attribution writes go through.
 */
export async function validReferral(
  cookieValue: string | null | undefined,
): Promise<string | null> {
  return (await getAmbassador(cookieValue))?.slug ?? null;
}
