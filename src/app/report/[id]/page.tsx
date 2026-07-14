import { notFound, redirect } from "next/navigation";
import { getStore } from "@/lib/db";
import { config } from "@/lib/config";
import { verifyReportToken } from "@/lib/sign";
import { ReportHeader } from "@/components/report/ReportHeader";
import { ListingIdentity } from "@/components/report/ListingIdentity";
import { StatCards } from "@/components/report/StatCards";
import { FixList } from "@/components/report/FixList";
import { RewritesView } from "@/components/report/RewritesView";
import { MarketEvidence } from "@/components/report/MarketEvidence";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

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

  const allowed =
    audit.paid ||
    config.testingShowFullReport || // QA: view/print the PDF without paying
    (t ? verifyReportToken(id, t) : false);
  if (!allowed) redirect(`/result/${id}`);

  return (
    <main className="mx-auto max-w-3xl px-8 py-10">
      <ReportHeader subtitle="Listing intelligence report" />

      <section className="mt-6">
        <h1 className="text-2xl font-bold text-brand-navy">Villa listing audit</h1>
        <ListingIdentity
          title={audit.listing_title}
          photo={audit.listing_photo}
          airbnbUrl={audit.airbnb_url}
        />
        <p className="mt-3 text-sm text-brand-muted">
          Compared against {audit.comp_basis}. Fixes ordered by impact.
        </p>
      </section>

      <section className="mt-6">
        <StatCards
          score={audit.overall_score}
          underpricingIdr={audit.underpricing_idr}
          criticalCount={audit.critical_count}
          compCount={audit.comp_count}
        />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-brand-muted">
          Fix list
        </h2>
        <FixList fixes={audit.fixes} />
      </section>

      {audit.market_evidence && <MarketEvidence evidence={audit.market_evidence} />}

      <section className="mt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-brand-muted">
          Paste-ready rewrites
        </h2>
        <RewritesView rewrites={audit.rewrites} />
      </section>

      <div className="no-print mt-8 flex justify-center">
        <PrintButton auto={print === "1"} />
      </div>

      <footer className="mt-10 border-t border-brand-line pt-4 text-center text-xs text-brand-muted">
        OptiRent · Figures benchmarked via AirROI comparable set.
        Estimates, not guarantees. Listing-quality factors only.
      </footer>
    </main>
  );
}
