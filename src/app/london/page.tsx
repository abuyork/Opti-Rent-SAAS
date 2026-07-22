import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";
import { getLandingScope } from "@/lib/landing";

/** London campaign landing page — London data only, no other markets mentioned. */
export const metadata: Metadata = {
  title: "OptimoRent London - Your flat is leaving money on the table",
  description:
    "Paste your Airbnb URL and get a free listing score, an underpricing estimate against comparable London flats, and a fix list built from 200 deep-scanned London listings.",
};

export default function LondonLanding() {
  return <LandingPage scope={getLandingScope("london")} />;
}
