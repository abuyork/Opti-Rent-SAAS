import type { ScoringInput, ScoringResult } from "@/lib/types";
import type { Scorer } from "./scorer";

/**
 * Mock scorer. Returns the Build Pack sample result for "Villa Seraya"
 * (41/100, −Rp 4.8M/mo over 23 comps, 3 critical fixes). Lets the audit →
 * paywall → PDF flow be developed and demoed without an Anthropic key.
 *
 * underpricing_idr is computed from the actual input so it stays consistent if
 * the mock listing's rate is changed.
 */
export class MockScorer implements Scorer {
  async score({ listing, comps }: ScoringInput): Promise<ScoringResult> {
    const underpricing = Math.max(
      0,
      comps.benchmark_nightly_rate - listing.nightly_rate,
    );

    return {
      overall_score: 41,
      category_scores: {
        photos: 38,
        title: 35,
        pricing_position: 80,
        description: 38,
        amenity_gap: 60,
        reviews: 55,
        risk_rules: 70,
      },
      underpricing_idr: underpricing,
      comp_count: comps.comp_count,
      comp_basis: `${comps.comp_count} ${comps.area} ${comps.bed_count}BR pool villas`,
      problem_count: 6,
      critical_count: 3,
      fixes: [
        {
          severity: "critical",
          title: "Replace hero photo",
          detail:
            "Currently an interior shot. Move the pool-at-sunset image to position 1 — every comp above you leads with pool or view.",
          comp_basis: "hero is interior; comps lead with pool/view",
        },
        {
          severity: "critical",
          title: "Rewrite title",
          detail:
            '"Cozy Berawa Home" omits the two terms guests filter and search for: private pool and Echo Beach proximity. See rewrite below.',
          comp_basis: "title omits pool + landmark",
        },
        {
          severity: "critical",
          title: "Address WiFi complaints",
          detail:
            '2 of last 8 reviews mention slow WiFi. Fix the connection, then note "fibre WiFi" in amenities — it\'s now a recurring rating drag.',
          comp_basis: "2 of 8 recent reviews cite slow WiFi",
        },
        {
          severity: "high",
          title: "Rewrite description opening",
          detail:
            "First line lists bedrooms. Lead with the experience — pool, privacy, walk to Echo Beach. See rewrite below.",
          comp_basis: "opening is an inventory list",
        },
        {
          severity: "high",
          title: "Add 6+ photos",
          detail:
            "14 photos vs comp average of 26. Missing: night pool, bathroom, kitchen, and a Berawa-area shot.",
          comp_basis: `comps avg ${comps.avg_photo_count}, this ${listing.photos.length}`,
        },
        {
          severity: "medium",
          title: "List 2 filtered amenities",
          detail:
            'Comps list "dedicated workspace" and "AC in all bedrooms" — you have both but they\'re not tagged. Guests filter on these.',
          comp_basis: "2 filtered amenities untagged vs comps",
        },
      ],
      rewrites: {
        title: {
          before: listing.title,
          after: "Private Pool Villa · 4 min walk to Echo Beach, Berawa",
        },
        description_opening: {
          before: listing.description,
          after:
            "Wake to your own private pool, just a 4-minute walk from Echo Beach. Villa Seraya is a quiet 3-bedroom retreat in the heart of Berawa — open-plan living that opens straight onto the pool deck, fast fibre WiFi for remote work, and air-conditioned bedrooms for cool Bali nights. Surf at dawn, work by the pool, dine at Canggu's best a few minutes away.",
        },
      },
    };
  }
}
