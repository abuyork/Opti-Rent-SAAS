"use client";

import { useState } from "react";

/**
 * Starts a one-time Stripe Checkout for an audit (Build Pack §7). Posts to
 * /api/checkout and redirects to the returned Checkout URL. In mock mode the
 * route returns a local unlock URL so the flow works without Stripe keys.
 */
export default function PayButton({
  auditId,
  priceLabel,
}: {
  auditId: string;
  priceLabel: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed.");
      window.location.href = data.url;
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={checkout}
        disabled={loading}
        className="rounded-lg bg-brand-navy px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-navy-soft disabled:opacity-60"
      >
        {loading ? "Starting checkout…" : `Unlock full report — ${priceLabel}`}
      </button>
      {error && <p className="text-sm text-sev-critical">{error}</p>}
    </div>
  );
}
