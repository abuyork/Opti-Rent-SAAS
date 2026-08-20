import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing/LandingPage";
import { getLandingScope } from "@/lib/landing";
import { getAmbassador } from "@/lib/ambassadors-server";
import { socialCard } from "@/lib/og";

/**
 * Ambassador referral landing — the Bali campaign page with the kicker swapped
 * for a personal invitation ("Gusde invites you to grow your Airbnb"; the
 * kicker's CSS uppercases it). The referral cookie itself is stamped by
 * src/proxy.ts, which matches exactly this route.
 *
 * Rendered per request (not prerendered) on purpose: the name comes from the
 * ambassadors table, so a row added in the Supabase Table Editor is live here
 * immediately, no deploy. Unknown or retired slugs bounce to the plain /bali
 * page: a mistyped link still lands somewhere useful.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "OptimoRent Bali - Your villa is leaving money on the table",
  description:
    "Paste your Airbnb villa URL and get a free listing score, an underpricing estimate against comparable Bali villas, and a fix list built from 1,500+ deep-scanned listings across 9 regions.",
  // Ambassador copies of /bali must never compete with the real page in search.
  robots: { index: false, follow: true },
  ...socialCard("bali"),
};

export default async function AmbassadorLanding({
  params,
}: {
  params: Promise<{ ambassador: string }>;
}) {
  const { ambassador } = await params;
  const amb = await getAmbassador(ambassador);
  if (!amb) redirect("/bali");
  const scope = getLandingScope("bali");
  return (
    <LandingPage
      scope={{
        ...scope,
        kicker: `${amb.name} invites you to grow your Airbnb`,
      }}
    />
  );
}
