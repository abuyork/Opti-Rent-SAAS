import { NextResponse } from "next/server";
import { dispatchAuditJob } from "@/lib/audit";
import { getStore } from "@/lib/db";
import { AirRoiError } from "@/lib/airroi";
import { resolveAirbnbListingId } from "@/lib/airroi/url";

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
    const audit = await store.createPendingAudit({
      airbnb_url: url,
      airroi_listing_id: listingId,
      email,
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
