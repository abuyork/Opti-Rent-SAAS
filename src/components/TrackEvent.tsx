"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";

/**
 * Fires one GA4 event when a server-rendered page is shown — the paywall
 * view and the post-payment landings, which have no click to hang an event
 * off. Renders nothing.
 *
 * The ref guard stops React's development StrictMode double-mount from
 * sending the event twice. Refreshes still re-send, which is why every
 * purchase event carries a transaction_id: GA4 drops repeats of a
 * transaction id it has already seen.
 */
export default function TrackEvent({
  event,
  params,
}: {
  event: string;
  params?: Record<string, unknown>;
}) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track(event, params);
    // Fire-once on mount: params is a fresh object each render and must not
    // re-trigger the event.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
