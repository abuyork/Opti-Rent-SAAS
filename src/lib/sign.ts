import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "@/lib/config";

/**
 * Stateless signed tokens for unlock/report links (Build Pack §7 "signed report
 * link"). HMAC-SHA256 over the payload with REPORT_LINK_SECRET.
 */
export function sign(payload: string): string {
  return createHmac("sha256", config.reportLinkSecret).update(payload).digest("hex");
}

export function verify(payload: string, token: string): boolean {
  const expected = sign(payload);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Token that authorises unlocking a specific audit. */
export function unlockToken(auditId: string): string {
  return sign(`unlock:${auditId}`);
}

export function verifyUnlockToken(auditId: string, token: string): boolean {
  return verify(`unlock:${auditId}`, token);
}

/**
 * Authorises downloading one playbook PDF. Minted server-side only after a
 * payment is confirmed, then handed to the buyer's browser — the PDFs live in
 * a private bucket and are never reachable by guessing a URL.
 *
 * Tokens EXPIRE (72h): the token is `<unix-expiry>.<hmac over market+expiry>`.
 * The old constant-payload token was effectively a permanent, universal
 * free-download link once anyone shared it — and the thank-you page promised
 * an expiry the code didn't have. A buyer who loses the link past expiry
 * re-opens it from their email or writes to us.
 */
export const PLAYBOOK_TOKEN_TTL_SECONDS = 72 * 60 * 60;

export function playbookDownloadToken(
  market: string,
  ttlSeconds: number = PLAYBOOK_TOKEN_TTL_SECONDS,
): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  return `${exp}.${sign(`playbook-download:${market}:${exp}`)}`;
}

export function verifyPlaybookDownloadToken(market: string, token: string): boolean {
  const [expRaw, mac] = token.split(".", 2);
  if (!/^\d{10,}$/.test(expRaw ?? "") || !mac) return false;
  const exp = Number(expRaw);
  if (exp <= Math.floor(Date.now() / 1000)) return false;
  return verify(`playbook-download:${market}:${exp}`, mac);
}

/**
 * Keyless stand-in for a Stripe session, mirroring `unlockToken` for audits:
 * without STRIPE_SECRET_KEY the buy flow still completes locally so the page
 * can be tested end to end. Never mint this when Stripe is configured.
 */
export function playbookMockToken(market: string): string {
  return sign(`playbook-mock:${market}`);
}

export function verifyPlaybookMockToken(market: string, token: string): boolean {
  return verify(`playbook-mock:${market}`, token);
}

/** Token for emailed report links (Build Pack §7 "signed report link"). */
export function reportToken(auditId: string): string {
  return sign(`report:${auditId}`);
}

export function verifyReportToken(auditId: string, token: string): boolean {
  return verify(`report:${auditId}`, token);
}
