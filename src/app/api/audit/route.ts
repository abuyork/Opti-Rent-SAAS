import { NextResponse } from "next/server";
import { dispatchAuditJob } from "@/lib/audit";
import { getStore } from "@/lib/db";
import { AirRoiError } from "@/lib/airroi";
import { resolveAirbnbListingId } from "@/lib/airroi/url";
import { config } from "@/lib/config";
import { isCompedEmail } from "@/lib/access";

/** Requester IP: Netlify's canonical header first, then the proxy chain head. */
function clientIp(req: Request): string | null {
  return (
    req.headers.get("x-nf-client-connection-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null
  );
}

const LIMIT_MESSAGE =
  "You've reached today's free audit limit. Come back tomorrow, or write to " +
  `${config.email.contact} if you manage several listings.`;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Public audit endpoint — ASYNC (Build Pack §4 steps 1-6, restructured for
 * serverless):
 *
 *   POST { url, email } → validate + resolve the Airbnb id (fast) → create a
 *   'processing' audit row + lead → kick off scoring in the background →
 *   return { id } in ~1-3s. The result page polls GET /api/audit/[id] and
 *   renders when the row completes. Scoring takes 30-70s (Claude vision +
 *   market evidence), far beyond Netlify's ~30s synchronous function cap —
 *   hence the split.
 *
 * Background dispatch: on Netlify, invoke the audit-background function
 * (15-min limit; returns 202 instantly). On a persistent server (next dev /
 * next start), run detached in-process.
 */
export async function POST(req: Request) {
  let url: string;
  let email: string;
  try {
    const body = (await req.json()) as { url?: string; email?: string };
    url = (body.url ?? "").trim();
    email = (body.email ?? "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "Enter a valid Airbnb listing URL." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  // Resolve the listing id up front (string parse; one redirect-follow for
  // short links). Catches "not an Airbnb link" instantly, inline on the form —
  // AirROI coverage errors surface on the progress page instead.
  let listingId: string;
  try {
    listingId = await resolveAirbnbListingId(url);
  } catch (e) {
    const message =
      e instanceof AirRoiError ? e.userMessage : "Enter a valid Airbnb listing URL.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const store = getStore();

    // Daily caps per email and per IP (each audit spends real API money).
    // Counted in the DB so the limit holds across serverless instances.
    // Comped emails skip both caps (Alex 2026-08-10): they are internal
    // accounts demoing the product, and hitting "come back tomorrow" mid-demo
    // reads as a bug. Repeat audits of one listing still reuse the stored
    // result, so the real spend is only new listings.
    const ip = clientIp(req);
    const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
    const counts = isCompedEmail(email)
      ? { byEmail: 0, byIp: 0 }
      : await store.countRecentAudits(email, ip, since);
    if (
      counts.byEmail >= config.limits.auditsPerEmailPerDay ||
      counts.byIp >= config.limits.auditsPerIpPerDay
    ) {
      console.warn(
        `[audit] rate limit hit: email=${email} (${counts.byEmail}) ip=${ip} (${counts.byIp})`,
      );
      return NextResponse.json({ error: LIMIT_MESSAGE }, { status: 429 });
    }

    const audit = await store.createPendingAudit({
      airbnb_url: url,
      airroi_listing_id: listingId,
      email,
      client_ip: ip,
    });
    await store.createLead({ email, airbnb_url: url, source: "audit" });

    await dispatchAuditJob(audit.id, url);

    return NextResponse.json({ id: audit.id, status: "processing" });
  } catch (e) {
    console.error("[/api/audit] failed to queue:", e);
    return NextResponse.json(
      { error: "We couldn't start the audit right now. Please try again." },
      { status: 502 },
    );
  }
}
