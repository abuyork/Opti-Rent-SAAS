import { NextResponse, type NextRequest } from "next/server";
import {
  REFERRAL_COOKIE,
  REFERRAL_COOKIE_MAX_AGE,
  referralFromCookie,
} from "@/lib/ambassadors";

/**
 * Stamps the ambassador referral cookie on /bali/<slug> visits; the matcher
 * keeps every other route off this code path. It must be an HTTP Set-Cookie
 * (not client JS): Safari's ITP caps document.cookie writes at ~7 days, which
 * would break "attribution survives until they're ready to buy".
 *
 * Last-touch by design: a newer ambassador link overwrites an older cookie.
 * Unknown slugs set nothing — the page itself redirects them to /bali.
 */
export function proxy(req: NextRequest) {
  const slug = referralFromCookie(req.nextUrl.pathname.split("/")[2]);
  const res = NextResponse.next();
  if (slug) {
    res.cookies.set(REFERRAL_COOKIE, slug, {
      maxAge: REFERRAL_COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
      // Deliberately readable by client JS: GA events attach it as a param.
      httpOnly: false,
    });
  }
  return res;
}

export const config = { matcher: "/bali/:slug" };
