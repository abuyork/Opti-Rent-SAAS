import Script from "next/script";
import { GA_ID } from "@/lib/analytics";

/**
 * Loads gtag.js once, in the root layout. Renders nothing when
 * NEXT_PUBLIC_GA_ID is unset, so dev and preview traffic stays out of the
 * production property.
 *
 * Page views: GA4's enhanced measurement counts browser-history changes by
 * default, and the App Router navigates with pushState, so client-side route
 * changes are already reported. There is deliberately no manual pageview
 * wiring here — adding one would double-count every soft navigation.
 */
export function GoogleAnalytics() {
  if (!GA_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
      </Script>
    </>
  );
}
