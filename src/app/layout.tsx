import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OptiRent — Your villa is leaving money on the table",
  description:
    "Paste your Airbnb villa URL and get a free listing score, an underpricing estimate vs. comparable villas, and a problem count. A Réntlyn product.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
