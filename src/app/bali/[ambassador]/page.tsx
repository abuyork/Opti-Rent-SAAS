import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing/LandingPage";
import { getLandingScope } from "@/lib/landing";
import { AMBASSADORS, isAmbassadorSlug } from "@/lib/ambassadors";
import { socialCard } from "@/lib/og";

/**
 * Ambassador referral landing — the Bali campaign page with the kicker swapped
 * for a personal invitation ("Gusde invites you to grow your Airbnb"; the
 * kicker's CSS uppercases it). The referral cookie itself is stamped by
 * src/proxy.ts, which matches exactly this route. Unknown slugs bounce to the
 * plain /bali page: a mistyped link still lands somewhere useful and sets
 * nothing.
 */
export const metadata: Metadata = {
  title: "OptimoRent Bali - Your villa is leaving money on the table",
  description:
    "Paste your Airbnb villa URL and get a free listing score, an underpricing estimate against comparable Bali villas, and a fix list built from 1,500+ deep-scanned listings across 9 regions.",
  // Ambassador copies of /bali must never compete with the real page in search.
  robots: { index: false, follow: true },
  ...socialCard("bali"),
};

export function generateStaticParams() {
  return Object.keys(AMBASSADORS).map((ambassador) => ({ ambassador }));
}

export default async function AmbassadorLanding({
  params,
}: {
  params: Promise<{ ambassador: string }>;
}) {
  const { ambassador } = await params;
  const slug = ambassador.toLowerCase();
  if (!isAmbassadorSlug(slug)) redirect("/bali");
  const scope = getLandingScope("bali");
  return (
    <LandingPage
      scope={{
        ...scope,
        kicker: `${AMBASSADORS[slug].name} invites you to grow your Airbnb`,
      }}
    />
  );
}
