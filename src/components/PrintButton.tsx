"use client";

import { useEffect, useRef, useState } from "react";

/** Give slow image CDNs a fair chance, but never hold the dialog forever. */
const READY_TIMEOUT_MS = 8000;

/**
 * Wait until the page is actually printable: fonts loaded and every <img>
 * settled (loaded or errored). The old fixed 400ms delay fired the print
 * dialog long before the ten winner covers came off the image CDN, which
 * printed the report with blank photo boxes (manager report 2026-08-05).
 */
async function waitUntilPrintable(): Promise<void> {
  const images = Array.from(document.images).map((img) =>
    img.complete
      ? Promise.resolve()
      : new Promise<void>((resolve) => {
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        }),
  );
  const fonts = document.fonts?.ready.then(() => undefined) ?? Promise.resolve();
  const timeout = new Promise<void>((r) => setTimeout(r, READY_TIMEOUT_MS));
  await Promise.race([Promise.all([...images, fonts]).then(() => undefined), timeout]);
}

/**
 * "Save as PDF" via the browser print pipeline (HTML → PDF, Build Pack §7).
 * Auto-opens the print dialog when the page is loaded with ?print=1 — but only
 * once everything the paper needs is on screen.
 */
export default function PrintButton({ auto }: { auto?: boolean }) {
  const [preparing, setPreparing] = useState(false);
  const printing = useRef(false); // guard against double-fire (auto + click)

  async function print() {
    if (printing.current) return;
    printing.current = true;
    setPreparing(true);
    try {
      await waitUntilPrintable();
    } finally {
      setPreparing(false);
      window.print();
      printing.current = false;
    }
  }

  useEffect(() => {
    if (auto) void print();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  return (
    <button
      onClick={() => void print()}
      disabled={preparing}
      className="no-print rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-charcoal disabled:opacity-60"
    >
      {preparing ? "Preparing your PDF…" : "Download or print PDF"}
    </button>
  );
}
