import { config } from "@/lib/config";
import { reportToken } from "@/lib/sign";

/**
 * Report email ("PDF Report - to Email", manager ask 2026-07-14; Build Pack §4.7
 * "email report link"). Sent by the background job when an audit completes.
 *
 * Uses Resend's REST API directly (no SDK needed). Without RESEND_API_KEY the
 * send is a logged no-op — email must never block or fail an audit.
 *
 * Paywall note: the signed /report link (the printable PDF) bypasses payment by
 * design (§7 "signed report link" = the paid artifact). It is only included
 * when the audit is paid or the testing unlock is on; free-tier emails link to
 * the result page, which enforces the paywall.
 */
export async function sendReportReadyEmail(opts: {
  to: string;
  auditId: string;
  listingTitle: string | null;
  includePdfLink: boolean;
}): Promise<boolean> {
  const base = process.env.URL ?? config.appUrl;
  const resultUrl = `${base}/result/${opts.auditId}`;
  const pdfUrl = `${base}/report/${opts.auditId}?t=${reportToken(opts.auditId)}`;
  const name = opts.listingTitle ?? "your listing";

  if (!config.email.resendApiKey) {
    console.log(
      `[email] RESEND_API_KEY not set - skipped "report ready" email to ${opts.to} (${resultUrl})`,
    );
    return false;
  }

  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;color:#0a0a0a">
      <h2 style="color:#0a0a0a;font-weight:500">Your OptiRent audit is ready</h2>
      <p>We finished analyzing <b>${escapeHtml(name)}</b> against the top earners in its market.</p>
      <p style="margin:24px 0">
        <a href="${resultUrl}"
           style="background:#0a0a0a;color:#fff;padding:12px 22px;border-radius:9999px;text-decoration:none;font-weight:500">
          View your audit
        </a>
      </p>
      ${
        opts.includePdfLink
          ? `<p>Your printable PDF report: <a href="${pdfUrl}" style="color:#0a0a0a">download or print</a>. Keep this link, it's yours.</p>`
          : ""
      }
      <p style="color:#858585;font-size:13px;margin-top:28px">
        Figures are benchmark estimates from comparable listings, not guarantees.
        OptiRent · listing intelligence.
      </p>
    </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.email.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.email.from,
        to: [opts.to],
        subject: `Your listing audit is ready: ${truncate(name, 60)}`,
        html,
      }),
    });
    if (!res.ok) {
      console.error(`[email] Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email] send failed:", e);
    return false;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
