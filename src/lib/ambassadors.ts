/**
 * Bali ambassador referral program (Alex 2026-08-20). Each ambassador gets a
 * personal landing link — optimo.rent/bali/<slug> — that renders the Bali
 * campaign page with a personal invitation kicker and stamps a long-lived
 * referral cookie, so a later report or playbook purchase from that visitor
 * attributes to them (audits.referral_ref + Stripe session metadata.referral).
 *
 * Adding an ambassador is one line here plus a deploy — the same
 * config-in-code pattern as MARKETS and PLAYBOOKS. Slugs must be lowercase and
 * URL-safe: they appear in URLs, GA event params, the audits table and Stripe
 * metadata exactly as written here.
 */
export interface Ambassador {
  /** Display name, exactly as the landing kicker reads it (CSS uppercases). */
  name: string;
}

export const AMBASSADORS: Record<string, Ambassador> = {
  gusde: { name: "Gusde" },
};

/** First-party referral cookie. Last-touch: the newest ambassador link wins. */
export const REFERRAL_COOKIE = "or_ref";

/**
 * 180 days, in seconds. The cookie is set via an HTTP response header
 * (src/proxy.ts), never document.cookie — Safari's ITP caps script-set cookies
 * at ~7 days, and ambassador links travel over WhatsApp/Instagram to iPhones.
 */
export const REFERRAL_COOKIE_MAX_AGE = 180 * 24 * 3600;

export function isAmbassadorSlug(slug: string): boolean {
  return Object.hasOwn(AMBASSADORS, slug);
}

/**
 * Registry-validated referral slug from a cookie value or URL segment;
 * null when absent or unknown, so junk cookie values never reach the DB,
 * Stripe metadata, or GA.
 */
export function referralFromCookie(value: string | null | undefined): string | null {
  const slug = (value ?? "").trim().toLowerCase();
  return slug && isAmbassadorSlug(slug) ? slug : null;
}
