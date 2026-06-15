import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Airbnb listing photos are remote; allow them in next/image when we render previews.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.muscache.com" },
      { protocol: "https", hostname: "**.airbnb.com" },
    ],
  },
};

export default nextConfig;
