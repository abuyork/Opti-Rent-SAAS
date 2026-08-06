import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { runAudit } from "@/lib/audit";

/**
 * Internal scoring endpoint (build-order milestone #2: "one villa end-to-end").
 * Returns the FULL result (fixes + rewrites) and spends real AirROI + Claude
 * credit per call — so it is LOCKED behind the shared job secret. It sat on
 * production unauthenticated until 2026-08-06: anyone who found it could pull
 * the paid report for free and burn ~$0.55 of API credit per request. 404 (not
 * 403) so the route doesn't advertise its existence.
 *
 * Internal use:  POST { url }  with header  x-optirent-job-secret: <REPORT_LINK_SECRET>
 */
export async function POST(req: Request) {
  if (req.headers.get("x-optirent-job-secret") !== config.reportLinkSecret) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let url: string;
  try {
    const body = (await req.json()) as { url?: string };
    if (!body.url || typeof body.url !== "string") {
      return NextResponse.json({ error: "Missing 'url' in request body" }, { status: 400 });
    }
    url = body.url;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const { resolved, scoring } = await runAudit(url);
    return NextResponse.json({
      airroi_listing_id: resolved.airroi_listing_id,
      content_fallback: resolved.content_fallback ?? false,
      scoring,
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Audit failed" },
      { status: 502 },
    );
  }
}
