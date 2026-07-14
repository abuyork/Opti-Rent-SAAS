"use client";

import { useEffect, useRef, useState } from "react";

/** Staged copy so the 30-70s wait feels alive; advances on a timer, not real progress. */
const STAGES: { at: number; label: string }[] = [
  { at: 0, label: "Pulling your listing from Airbnb…" },
  { at: 6, label: "Finding comparable listings in your area…" },
  { at: 14, label: "Benchmarking against your market's top earners…" },
  { at: 24, label: "AI is reviewing your photos and copy…" },
  { at: 45, label: "Writing your fix list and rewrites…" },
  { at: 75, label: "Almost there — finalizing your report…" },
];

const POLL_MS = 3000;
const GIVE_UP_MS = 5 * 60 * 1000; // stop polling after 5 min and show guidance

/**
 * Progress screen for the async audit flow. Polls GET /api/audit/[id] until
 * the background scorer completes, then reloads so the server-rendered result
 * page shows the finished report. On failure, surfaces the row's message.
 */
export default function AuditProgress({ auditId }: { auditId: string }) {
  const [elapsed, setElapsed] = useState(0);
  const [failed, setFailed] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    const tick = setInterval(
      () => setElapsed(Math.round((Date.now() - startedAt.current) / 1000)),
      1000,
    );

    let stopped = false;
    const poll = setInterval(async () => {
      if (stopped) return;
      if (Date.now() - startedAt.current > GIVE_UP_MS) {
        setTimedOut(true);
        clearInterval(poll);
        return;
      }
      try {
        const res = await fetch(`/api/audit/${auditId}`, { cache: "no-store" });
        if (!res.ok) return; // transient — keep polling
        const data = (await res.json()) as { status: string; error?: string | null };
        if (data.status === "complete") {
          stopped = true;
          clearInterval(poll);
          window.location.reload(); // server component re-renders with the full report
        } else if (data.status === "failed") {
          stopped = true;
          clearInterval(poll);
          setFailed(data.error ?? "We couldn't finish analyzing this listing.");
        }
      } catch {
        // network blip — keep polling
      }
    }, POLL_MS);

    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [auditId]);

  if (failed) {
    return (
      <div className="mt-10 rounded-lg border border-brand-line bg-brand-card px-6 py-8 text-center">
        <p className="text-lg font-semibold text-brand-navy">
          We hit a snag with this listing
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-brand-muted">{failed}</p>
        <a
          href="/"
          className="mt-6 inline-block rounded-lg bg-brand-navy px-6 py-3 text-sm font-semibold text-white hover:bg-brand-navy-soft"
        >
          Try another listing
        </a>
      </div>
    );
  }

  if (timedOut) {
    return (
      <div className="mt-10 rounded-lg border border-brand-line bg-brand-card px-6 py-8 text-center">
        <p className="text-lg font-semibold text-brand-navy">
          This is taking longer than usual
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-brand-muted">
          Your audit is still being processed. Refresh this page in a minute —
          your report link stays valid.
        </p>
      </div>
    );
  }

  const stage = [...STAGES].reverse().find((s) => elapsed >= s.at) ?? STAGES[0];

  return (
    <div className="mt-10 flex flex-col items-center gap-4 rounded-lg border border-brand-line bg-brand-card px-6 py-10 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-line border-t-brand-teal" />
      <p className="text-base font-semibold text-brand-navy">{stage.label}</p>
      <p className="max-w-md text-sm text-brand-muted">
        A full audit takes about a minute — we compare your listing against the
        top earners in your exact market. This page updates automatically.
      </p>
    </div>
  );
}
