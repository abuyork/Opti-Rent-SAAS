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

/** Token for emailed report links (Build Pack §7 "signed report link"). */
export function reportToken(auditId: string): string {
  return sign(`report:${auditId}`);
}

export function verifyReportToken(auditId: string, token: string): boolean {
  return verify(`report:${auditId}`, token);
}
