import { processAuditJob } from "../../src/lib/audit";
import { config } from "../../src/lib/config";

/**
 * Netlify Background Function (name suffix "-background" → Netlify ACKs the
 * caller with 202 immediately and lets this run up to 15 minutes).
 *
 * Does the slow part of an audit — AirROI + Claude vision scoring (30-70s) —
 * that can't fit in a synchronous function's ~30s cap. The pending audit row
 * is created by POST /api/audit before this is invoked; processAuditJob
 * completes or fails that row, so this function never needs to respond with
 * data. Guarded by a shared secret so strangers can't burn paid API credit.
 */
export default async (req: Request): Promise<Response> => {
  if (req.headers.get("x-optirent-job-secret") !== config.reportLinkSecret) {
    return new Response("forbidden", { status: 403 });
  }

  let auditId: string | undefined;
  let url: string | undefined;
  try {
    ({ auditId, url } = (await req.json()) as { auditId?: string; url?: string });
  } catch {
    return new Response("bad request", { status: 400 });
  }
  if (!auditId || !url) return new Response("bad request", { status: 400 });

  await processAuditJob(auditId, url);
  return new Response("done");
};
