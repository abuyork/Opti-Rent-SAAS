import { NextResponse } from "next/server";
import { runAudit, toFreeView } from "@/lib/audit";
import { getStore } from "@/lib/db";
import { AirRoiError } from "@/lib/airroi";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Public free-audit endpoint (Build Pack §4 steps 1–6).
 * POST { url, email } → resolve + score → persist audit + lead → return the
 * FREE view only (score, underpricing, problem/critical counts). Fixes and
 * rewrites stay server-side until payment.
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

  try {
    const { resolved, scoring } = await runAudit(url);
    const store = getStore();
    const audit = await store.createAudit({
      airbnb_url: url,
      airroi_listing_id: resolved.airroi_listing_id,
      email,
      scoring,
    });
    await store.createLead({
      email,
      airbnb_url: url,
      score: scoring.overall_score,
      underpricing: scoring.underpricing_idr,
      problem_count: scoring.problem_count,
      source: "audit",
    });

    return NextResponse.json({ id: audit.id, free: toFreeView(audit.id, scoring, false) });
  } catch (e) {
    // Log the real error server-side; show the owner a clean, non-leaky message.
    console.error("[/api/audit] failed:", e);
    const message =
      e instanceof AirRoiError
        ? e.userMessage
        : "We couldn't audit that listing right now. Please try again.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
