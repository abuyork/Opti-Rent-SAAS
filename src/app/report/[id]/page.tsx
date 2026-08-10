import { notFound, redirect } from "next/navigation";
import { getStore } from "@/lib/db";
import { config } from "@/lib/config";
import { verifyReportToken } from "@/lib/sign";
import { hasFullReportAccess } from "@/lib/access";
import { ReportHeader } from "@/components/report/ReportHeader";
import { ListingIdentity } from "@/components/report/ListingIdentity";
import { StatCards } from "@/components/report/StatCards";
import { cohortTotalFor } from "@/lib/market/benchmarks";
import { comparedAgainstLine } from "@/lib/report-copy";
import { FixList } from "@/components/report/FixList";
import { RewritesView } from "@/components/report/RewritesView";
import { MarketEvidence } from "@/components/report/MarketEvidence";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

/**
 * The browser may print the document title in its page header (user setting we
 * cannot suppress from CSS), so the PDF must not inherit the marketing tagline
 * from the root layout — it printed "Your Airbnb is leaving money on the
 * table" on Max's copy (2026-08-05). Title the document like the report it is.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const audit = await getStore().getAudit(id);
  const name = audit?.listing_title?.trim();
  return { title: name ? `Listing audit - ${name}` : "Listing audit - OptimoRent" };
}

/**
 * Branded single-page A4 report (Build Pack §7 PDF). Accessible when the audit
 * is paid, or via a signed report-link token (emailed link). Print/Save-as-PDF
 * uses the @page A4 + @media print rules in globals.css.
 */
export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string; print?: string }>;
}) {
  const { id } = await params;
  const { t, print } = await searchParams;

  const audit = await getStore().getAudit(id);
  if (!audit) notFound();
  // Async flow: no PDF until the background scorer has finished.
  if (audit.status !== "complete") redirect(`/result/${id}`);

  // Paid, comped, or testing-unlocked (see hasFullReportAccess) — or holding a
  // signed report-link token from the "report ready" email.
  const allowed = hasFullReportAccess(audit) || (t ? verifyReportToken(id, t) : false);
  if (!allowed) redirect(`/result/${id}`);

  return (
    <main className="mx-auto max-w-3xl px-8 py-10">
      <ReportHeader />

      <section className="mt-8">
        <h1 className="text-3xl font-normal tracking-[-0.025em] text-ink">
          Airbnb listing audit
        </h1>
        <ListingIdentity
          title={audit.listing_title}
          photo={audit.listing_photo}
          airbnbUrl={audit.airbnb_url}
        />
        <p className="mt-3 text-sm text-fog">
          {comparedAgainstLine(audit.comp_basis, audit.market_evidence)} Fixes
          ordered by impact.
        </p>
      </section>

      <section className="mt-8">
        <StatCards
          score={audit.overall_score}
          underpricingIdr={audit.underpricing_idr}
          criticalCount={audit.critical_count}
          compCount={audit.comp_count}
          currency={audit.market_evidence?.currency ?? "IDR"}
          marketCohortSize={audit.market_evidence?.sample_size ?? null}
          marketCohortTotal={cohortTotalFor(audit.market_evidence)}
          cohortLabel={audit.market_evidence?.cohort ?? null}
          nightlyRate={audit.market_evidence?.listing_nightly_rate ?? null}
          winnerNightlyRate={audit.market_evidence?.winner_median_adr_idr ?? null}
        />
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-2xl font-normal tracking-[-0.025em] text-ink">
          Fix list
        </h2>
        <FixList fixes={audit.fixes} />
      </section>

      {audit.market_evidence && <MarketEvidence evidence={audit.market_evidence} />}

      <section className="mt-10">
        <h2 className="mb-4 text-2xl font-normal tracking-[-0.025em] text-ink">
          Paste-ready rewrites
        </h2>
        <RewritesView rewrites={audit.rewrites} />
      </section>

      <div className="no-print mt-10 flex flex-col items-center gap-3">
        <PrintButton auto={print === "1"} />
        <a
          href={`/result/${audit.id}`}
          className="text-sm text-fog underline decoration-dove underline-offset-2 hover:text-ink hover:decoration-ink"
        >
          Back to your report
        </a>
      </div>

      <footer className="mt-12 border-t border-dove pt-4 text-center">
        <div className="font-mono text-[11px] uppercase tracking-[0.15em] text-pewter">
          Listing intelligence
        </div>
        <a
          href={`mailto:${config.email.contact}`}
          className="mt-1.5 inline-block text-xs text-fog underline decoration-dove underline-offset-2 hover:text-ink hover:decoration-ink"
        >
          {config.email.contact}
        </a>
      </footer>
    </main>
  );
}
