import { NextResponse, type NextRequest } from "next/server";
import {
  REFERRAL_COOKIE,
  REFERRAL_COOKIE_MAX_AGE,
  referralCookieShape,
} from "@/lib/ambassadors";

/**
 * Stamps the ambassador referral cookie on /bali/<slug> visits; the matcher
 * keeps every other route off this code path. It must be an HTTP Set-Cookie
 * (not client JS): Safari's ITP caps document.cookie writes at ~7 days, which
 * would break "attribution survives until they're ready to buy".
 *
 * Shape check only, no DB: the edge holds no credentials and stays fast. A
 * made-up slug can set a throwaway cookie, but the page bounces it to /bali
 * and every attribution write validates against the ambassadors table, so
 * junk never reaches the DB, Stripe metadata, or GA.
 *
 * Last-touch by design: a newer ambassador link overwrites an older cookie.
 */
export function proxy(req: NextRequest) {
  const slug = referralCookieShape(req.nextUrl.pathname.split("/")[2]);
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
