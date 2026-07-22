import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";
import { getLandingScope } from "@/lib/landing";

/** Dubai campaign landing page — Dubai data only, no other markets mentioned. */
export const metadata: Metadata = {
  title: "OptimoRent Dubai - Your rental is leaving money on the table",
  description:
    "Paste your Airbnb URL and get a free listing score, an underpricing estimate against comparable Dubai rentals, and a fix list built from 200 deep-scanned Dubai listings.",
};

export default function DubaiLanding() {
  return <LandingPage scope={getLandingScope("dubai")} />;
}
