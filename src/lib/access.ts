import { config } from "@/lib/config";

/**
 * One answer to "may this person read the paid half of the report?", shared by
 * every surface that used to test `audit.paid` on its own: the result page, the
 * printable /report page, the polling endpoint's free view, the "report ready"
 * email's PDF link, and the checkout route (so a comped reader can never be
 * sent to Stripe).
 *
 * Three ways in:
 *   1. they paid;
 *   2. OPTIRENT_TESTING_UNLOCK_ALL is on (local QA only);
 *   3. their email is comped — see config.freeReportEmails.
 *
 * The comp is read-time and email-based. Emails are not verified at audit
 * creation, so anyone who types a comped address gets a free report; the
 * addresses are internal and unadvertised, which is the whole of the defence.
 */
export function isCompedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return config.freeReportEmails.includes(email.trim().toLowerCase());
}

/** The audit fields that decide access — anything with these two works. */
export interface ReportAccessInput {
  paid: boolean;
  email: string | null;
}

export function hasFullReportAccess(audit: ReportAccessInput): boolean {
  return audit.paid || config.testingShowFullReport || isCompedEmail(audit.email);
}
