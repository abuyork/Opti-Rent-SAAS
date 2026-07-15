import type { ResolvedListing } from "@/lib/types";
import type { AirRoiProvider } from "./provider";

/**
 * Mock AirROI adapter. Returns a deliberately mediocre Canggu villa modelled on
 * the Build Pack sample ("Villa Seraya"): interior hero, thin photo set, generic
 * title, inventory-list description, recurring WiFi complaints, and an ~8% price
 * gap to the comp benchmark. Fed through the scoring engine it reproduces the
 * sample report (41/100, −Rp 4.8M/mo, 3 critical fixes).
 *
 * Lets the entire app run end-to-end with zero credentials.
 */
const VILLA_SERAYA: ResolvedListing = {
  airroi_listing_id: "mock-villa-seraya",
  airbnb_url: "https://www.airbnb.com/rooms/mock-villa-seraya",
  listing: {
    title: "Cozy Berawa Home",
    description:
      "This home has 3 bedrooms, 2 bathrooms, a kitchen, and a pool. Located in Berawa.",
    photos: [
      "Living room, interior (hero)",
      "Bedroom 1",
      "Bedroom 2",
      "Kitchen",
      "Bathroom",
      "Dining area",
      "Hallway",
      "Pool at sunset", // buried at position #8
      "Garden",
      "Bedroom 3",
      "Living room, angle 2",
      "Front entrance",
      "Street view",
      "Balcony",
    ],
    amenities: [
      "WiFi",
      "Private pool",
      "Kitchen",
      "Air conditioning",
      "Washer",
      "Free parking",
      "TV",
    ],
    reviews: {
      count: 8,
      rating: 4.6,
      recent: [
        "Lovely pool and a quiet street.",
        "WiFi was really slow, hard to get any work done.",
        "Great location, walkable to Echo Beach.",
        "Comfortable beds and a clean villa.",
        "The internet kept dropping during video calls.",
        "Host was responsive and helpful.",
        "Good value for Berawa.",
        "The pool was the highlight of our stay.",
      ],
    },
    beds: 3,
    baths: 2,
    area: "Berawa",
    pool: true,
    nightly_rate: 1_840_000, // IDR
  },
  comps: {
    comp_count: 23,
    area: "Berawa",
    bed_count: 3,
    avg_photo_count: 26,
    benchmark_nightly_rate: 2_000_000, // IDR → ~8% gap, ~Rp 4.8M/mo
    common_amenities: [
      "Private pool",
      "WiFi",
      "Air conditioning",
      "Dedicated workspace",
      "AC in all bedrooms",
      "Kitchen",
      "Pool towels",
    ],
    pool_tier: "most comps have a private pool",
    sample_titles: [
      "Designer 3BR Pool Villa, 5 min to Echo Beach",
      "Tropical Family Villa, Private Pool, Berawa",
      "Luxe Jungle Villa with Pool near Finns Beach",
      "Modern 3BR Villa, Rooftop and Pool, Canggu",
    ],
  },
};

export class MockAirRoiProvider implements AirRoiProvider {
  async resolve(airbnbUrl: string): Promise<ResolvedListing> {
    return { ...VILLA_SERAYA, airbnb_url: airbnbUrl };
  }
}
