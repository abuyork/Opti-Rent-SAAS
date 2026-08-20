/**
 * Google Analytics 4 (gtag.js). One measurement ID, read from
 * NEXT_PUBLIC_GA_ID at BUILD time — Next inlines NEXT_PUBLIC_* into the
 * bundle, so setting the Netlify variable without a redeploy ships a site
 * with no analytics at all (same trap as the price vars in lib/config.ts).
 *
 * With the ID unset — local dev, deploy previews, any fork — nothing loads
 * and every track() call is a no-op, so development traffic can never reach
 * the production property.
 */
import { REFERRAL_COOKIE, referralCookieShape } from "@/lib/ambassadors";

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/**
 * Send one GA4 event. Safe to call anywhere on the client: no gtag on the
 * page (analytics off, script blocked, ad blocker) means it silently does
 * nothing rather than throwing inside a click handler.
 *
 * Call this BEFORE any window.location redirect — the browser cancels the
 * in-flight beacon once navigation starts, so a begin_checkout fired after
 * the redirect never arrives.
 */
export function track(event: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  window.gtag?.("event", event, params);
}

/** Cents to the plain number GA4 expects in `value` (1900 → 19). */
export function gaValue(usdCents: number): number {
  return Math.round(usdCents) / 100;
}

/**
 * Ambassador referral slug from the first-party cookie (set by src/proxy.ts,
 * non-httpOnly for exactly this read), as a spreadable event param — so GA4
 * funnels can be segmented per ambassador. Empty object when not referred.
 * Shape check only: the registry lives in the DB, which the client can't
 * reach — money attribution stays DB-validated server-side, so the worst a
 * hand-crafted cookie can do is decorate its own GA events.
 */
export function referralParam(): Record<string, string> {
  if (typeof document === "undefined") return {};
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${REFERRAL_COOKIE}=([^;]+)`));
  const referral = referralCookieShape(match ? decodeURIComponent(match[1]) : null);
  return referral ? { referral } : {};
}
