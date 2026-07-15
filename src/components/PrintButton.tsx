"use client";

import { useEffect } from "react";

/**
 * "Save as PDF" via the browser print pipeline (HTML → PDF, Build Pack §7).
 * Auto-opens the print dialog when the page is loaded with ?print=1.
 */
export default function PrintButton({ auto }: { auto?: boolean }) {
  useEffect(() => {
    if (auto) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [auto]);

  return (
    <button
      onClick={() => window.print()}
      className="no-print rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper hover:bg-charcoal"
    >
      Download or print PDF
    </button>
  );
}
