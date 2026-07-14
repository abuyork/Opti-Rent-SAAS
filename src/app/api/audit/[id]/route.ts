import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { toFreeView } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * Polling endpoint for the async audit flow. Returns the row's status plus the
 * FREE-tier view once complete — never fixes/rewrites (those stay behind the
 * paywall / result page).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const audit = await getStore().getAudit(id);
  if (!audit) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    status: audit.status,
    error: audit.status === "failed" ? audit.error_message : null,
    free:
      audit.status === "complete"
        ? toFreeView(audit.id, audit, audit.paid)
        : null,
  });
}
