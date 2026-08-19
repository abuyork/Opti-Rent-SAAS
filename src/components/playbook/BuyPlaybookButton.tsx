"use client";

import { useState } from "react";
import { postJson } from "@/lib/http";
import { track, gaValue } from "@/lib/analytics";

/**
 * Starts a one-time Stripe Checkout for one market playbook. Posts to
 * /api/checkout/playbook and redirects to the returned URL. Without Stripe keys
 * the route returns a signed thank-you URL instead, so the flow still completes.
 */
export default function BuyPlaybookButton({
  market,
  label,
  priceUsdCents,
}: {
  market: string;
  label: string;
  /** Config-driven playbook price, so GA's value follows a price change. */
  priceUsdCents: number;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkout() {
    setLoading(true);
    setError(null);
    try {
      const data = await postJson<{ url: string }>("/api/checkout/playbook", { market });
      // Before the redirect, never after: navigation cancels the beacon.
      track("begin_checkout", {
        currency: "USD",
        value: gaValue(priceUsdCents),
        items: [{ item_id: `playbook_${market}`, item_name: "Market playbook" }],
      });
      window.location.href = data.url;
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={checkout}
        disabled={loading}
        className="mt-8 w-full rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-charcoal disabled:opacity-60"
      >
        {loading ? "Starting checkout…" : label}
      </button>
      {error && <p className="mt-2 text-sm text-sev-critical">{error}</p>}
    </>
  );
}
