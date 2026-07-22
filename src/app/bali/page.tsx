import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";
import { getLandingScope } from "@/lib/landing";

/** Bali campaign landing page — Bali data only, no other markets mentioned. */
export const metadata: Metadata = {
  title: "OptimoRent Bali - Your villa is leaving money on the table",
  description:
    "Paste your Airbnb villa URL and get a free listing score, an underpricing estimate against comparable Bali villas, and a fix list built from 1,500+ deep-scanned listings across 9 regions.",
};

export default function BaliLanding() {
  return <LandingPage scope={getLandingScope("bali")} />;
}
