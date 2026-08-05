import type { AuditMarketEvidence } from "@/lib/types";
import { MARKETS } from "@/lib/market/markets";
import { stripEvidenceSuffix } from "@/lib/scoring/validate";

/**
 * The "Compared against …" line under the report heading.
 *
 * The model used to append its own description of the market evidence to
 * comp_basis, and improvised a different phrasing every run — including
 * analyst-speak like "winner cohort n=37" that reached a real user (manager
 * report 2026-08-05). The model now supplies only the nearby-comps phrase;
 * the evidence clause is composed here from the stored evidence, so its
 * wording is fixed, human, and consistent with the evidence section below it.
 */
export function comparedAgainstLine(
  compBasis: string,
  evidence: AuditMarketEvidence | null | undefined,
): string {
  // stripEvidenceSuffix also cleans legacy rows scored before this change.
  const base =
    stripEvidenceSuffix(compBasis || "").replace(/\.+$/, "") ||
    "the closest comparable listings";
  if (!evidence) return `Compared against ${base}.`;

  const title = MARKETS[evidence.market]?.title ?? evidence.market;
  const noun = (evidence.currency ?? "IDR") === "IDR" ? "villas" : "listings";
  return `Compared against ${base}, and ${evidence.sample_size} ${evidence.cohort} ${noun} measured in depth in ${title}.`;
}
