/**
 * Bali ambassador referral program (Alex 2026-08-20). Each ambassador gets a
 * personal landing link — optimo.rent/bali/<slug> — that renders the Bali
 * campaign page with a personal invitation kicker and stamps a long-lived
 * referral cookie, so a later report or playbook purchase from that visitor
 * attributes to them (audits.referral_ref + Stripe session metadata.referral).
 *
 * The registry lives in the `ambassadors` Supabase table (migration 0009) so
 * adding someone is a Table Editor row, not a deploy — see
 * lib/ambassadors-server.ts for the lookup. This module holds only the parts
 * that must run WITHOUT the database: the cookie contract and the slug shape
 * check, shared by the edge proxy (no DB credentials there) and the GA client
 * code (no DB on the client). Everything that writes attribution validates
 * against the table, so a shape-valid-but-unknown cookie never reaches the DB,
 * Stripe metadata, or the money events.
 */

/** First-party referral cookie. Last-touch: the newest ambassador link wins. */
export const REFERRAL_COOKIE = "or_ref";

/**
 * 180 days, in seconds. The cookie is set via an HTTP response header
 * (src/proxy.ts), never document.cookie — Safari's ITP caps script-set cookies
 * at ~7 days, and ambassador links travel over WhatsApp/Instagram to iPhones.
 */
export const REFERRAL_COOKIE_MAX_AGE = 180 * 24 * 3600;

/** Slug shape: lowercase letters/digits/hyphens, 2-32 chars, starts alnum.
 * Mirrored by the ambassadors table's CHECK constraint. */
export const AMBASSADOR_SLUG_RE = /^[a-z0-9][a-z0-9-]{1,31}$/;

/**
 * Shape-only normalization of a slug from a URL segment or cookie value;
 * null when it can't be an ambassador slug. NOT a registry check — callers
 * that stamp attribution must use validReferral() (ambassadors-server.ts).
 */
export function referralCookieShape(value: string | null | undefined): string | null {
  const slug = (value ?? "").trim().toLowerCase();
  return AMBASSADOR_SLUG_RE.test(slug) ? slug : null;
}
