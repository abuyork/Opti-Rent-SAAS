import { NextResponse } from "next/server";
import { verifyPlaybookDownloadToken } from "@/lib/sign";
import { PLAYBOOKS, isPlaybookKey } from "@/lib/playbooks";
import { signedPlaybookUrl } from "@/lib/playbook-storage";

/**
 * Serve a purchased playbook. The download token is minted only by the
 * thank-you page, after it has confirmed payment; this route re-verifies it and
 * redirects to a short-lived Supabase signed URL. The PDF itself is never
 * served from a guessable path.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const market = searchParams.get("market") ?? "";
  const token = searchParams.get("token") ?? "";

  if (!isPlaybookKey(market)) {
    return NextResponse.json({ error: "Unknown playbook" }, { status: 404 });
  }
  if (!verifyPlaybookDownloadToken(market, token)) {
    return NextResponse.json({ error: "Invalid download token" }, { status: 403 });
  }

  try {
    return NextResponse.redirect(await signedPlaybookUrl(PLAYBOOKS[market]));
  } catch (e) {
    console.error("[playbook/download]", e);
    return NextResponse.json(
      { error: "Could not prepare the download. Please contact support." },
      { status: 500 },
    );
  }
}
