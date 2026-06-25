import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow loading the dev server from this machine's LAN IP (e.g. testing on a
  // phone or another device). Without this, Next 15.3+/16 blocks cross-origin
  // /_next/* dev resources, the client never hydrates, and forms fall back to a
  // native submit that reloads the page to a blank state. Add new IPs here.
  allowedDevOrigins: ["10.66.115.65", "10.66.115.*", "192.168.*.*"],

  // Airbnb listing photos are remote; allow them in next/image when we render previews.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.muscache.com" },
      { protocol: "https", hostname: "**.airbnb.com" },
    ],
  },
};

export default nextConfig;
