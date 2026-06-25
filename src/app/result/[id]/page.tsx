import { notFound } from "next/navigation";
import { getStore } from "@/lib/db";
import { config } from "@/lib/config";
import { formatUsdFromCents } from "@/lib/format";
import { ReportHeader } from "@/components/report/ReportHeader";
import { StatCards } from "@/components/report/StatCards";
import { FixList, LockedFixPreview } from "@/components/report/FixList";
import { RewritesView } from "@/components/report/RewritesView";
import PayButton from "@/components/PayButton";

export const dynamic = "force-dynamic";

export default async function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const audit = await getStore().getAudit(id);
  if (!audit) notFound();

  const priceLabel = formatUsdFromCents(config.reportPriceUsdCents);
  const showFull = audit.paid || config.testingShowFullReport;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <ReportHeader subtitle="Listing intelligence" />

      <section className="mt-6">
        <h1 className="text-2xl font-bold text-brand-navy">Your villa audit</h1>
        <p className="mt-1 text-sm text-brand-muted">
          Score {audit.overall_score}/100 · Compared against {audit.comp_basis}. Fixes
          ordered by impact.
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

      {showFull ? (
        <>
          {!audit.paid && config.testingShowFullReport && (
            <div className="mt-8 rounded-lg border border-dashed border-brand-line bg-brand-card px-4 py-2 text-center text-xs text-brand-muted">
              Testing mode — full report shown without payment
              (OPTIRENT_TESTING_UNLOCK_ALL).
            </div>
          )}
          <section className="mt-10">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-brand-muted">
              Fix list
            </h2>
            <FixList fixes={audit.fixes} />
          </section>

          <section className="mt-10">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-brand-muted">
              Paste-ready rewrites
            </h2>
            <RewritesView rewrites={audit.rewrites} />
          </section>

          <section className="mt-10 flex flex-col items-center gap-4 border-t border-brand-line pt-8">
            <a
              href={`/report/${audit.id}?print=1`}
              className="rounded-lg bg-brand-teal px-6 py-3 text-sm font-semibold text-white hover:bg-brand-teal-soft"
            >
              Download PDF report
            </a>
            <p className="text-center text-sm text-brand-muted">
              Re-audit in 60 days at a discount to track your improvements.
            </p>
          </section>
        </>
      ) : (
        <section className="mt-10">
          <div className="rounded-lg bg-brand-card px-5 py-4 text-center">
            <p className="text-lg font-semibold text-brand-navy">
              {audit.problem_count} issues found, {audit.critical_count} critical.
            </p>
            <p className="mt-1 text-sm text-brand-muted">
              Unlock the full fix list, paste-ready rewrites, and a branded PDF.
            </p>
          </div>

          <h2 className="mt-8 mb-3 text-xs font-semibold uppercase tracking-widest text-brand-muted">
            Fix list (locked)
          </h2>
          <LockedFixPreview fixes={audit.fixes} />

          <div className="mt-8 flex flex-col items-center gap-3">
            <PayButton auditId={audit.id} priceLabel={priceLabel} />
            <p className="text-xs text-brand-muted">
              One-time payment · We&apos;ll email your report link.
            </p>
          </div>
        </section>
      )}

      <footer className="mt-12 border-t border-brand-line pt-4 text-center text-xs text-brand-muted">
        Figures benchmarked via AirROI comparable set. Estimates, not guarantees.
        Listing-quality factors only.
      </footer>
    </main>
  );
}
