import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { dispatchAuditJob } from "@/lib/audit";

/**
 * Re-run a FAILED audit in place (manager report 2026-08-05: a transient
 * upstream blip permanently failed an audit and the only way out was pasting
 * the URL again). The row's own URL + email are reused server-side, so the
 * client sends nothing and no PII leaves the server. Only failed rows qualify:
 * a complete row has nothing to retry, a processing row is already running.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const store = getStore();
  const audit = await store.getAudit(id);
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (audit.status !== "failed") {
    return NextResponse.json(
      { error: "This audit is not in a failed state." },
      { status: 409 },
    );
  }

  try {
    await store.markProcessing(id);
    await dispatchAuditJob(id, audit.airbnb_url);
    return NextResponse.json({ id, status: "processing" });
  } catch (e) {
    console.error(`[/api/audit/${id}/retry] failed to re-queue:`, e);
    // Put the row back in a truthful state so the UI doesn't spin forever.
    await store
      .failAudit(id, "We couldn't restart this audit. Please try again.")
      .catch(() => {});
    return NextResponse.json(
      { error: "We couldn't restart the audit right now. Please try again." },
      { status: 502 },
    );
  }
}
