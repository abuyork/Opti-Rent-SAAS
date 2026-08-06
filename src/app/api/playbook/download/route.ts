import { NextResponse } from "next/server";
import { config } from "@/lib/config";
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

  // A buyer opens this link in a browser tab, so every error names the address
  // that actually helps (matches the thanks-page copy). Download tokens expire
  // after 72h by design; the email tells buyers to write in for a resend.
  if (!isPlaybookKey(market)) {
    return NextResponse.json(
      { error: `We don't have a Playbook by that name. Write to ${config.email.contact} and we'll sort it out.` },
      { status: 404 },
    );
  }
  if (!verifyPlaybookDownloadToken(market, token)) {
    return NextResponse.json(
      { error: `This download link has expired. Write to ${config.email.contact} and we'll resend a fresh one.` },
      { status: 403 },
    );
  }

  try {
    return NextResponse.redirect(await signedPlaybookUrl(PLAYBOOKS[market]));
  } catch (e) {
    console.error("[playbook/download]", e);
    return NextResponse.json(
      { error: `We couldn't prepare the download. Write to ${config.email.contact} and we'll send the PDF straight back.` },
      { status: 500 },
    );
  }
}
