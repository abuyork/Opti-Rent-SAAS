import { LandingPage } from "@/components/landing/LandingPage";
import { getLandingScope } from "@/lib/landing";

/**
 * Universal landing page — works for hosts from any covered market (Bali,
 * Dubai, London), with market cards linking to the per-market campaign pages.
 */
export default function Home() {
  return <LandingPage scope={getLandingScope("home")} />;
}
