import { NextResponse } from "next/server";
import { runAudit } from "@/lib/audit";

/**
 * Dev/demo endpoint for build-order milestone #2 ("one villa end-to-end").
 * POST { url } → resolve via AirROI + score via Claude → full ScoringResult.
 *
 * NOTE: returns the FULL result (fixes + rewrites). The public free flow exposes
 * only the FreeAuditView; this route exists to verify the engine in isolation.
 */
export async function POST(req: Request) {
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
