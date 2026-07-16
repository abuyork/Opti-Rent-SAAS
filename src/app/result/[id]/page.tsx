import { notFound } from "next/navigation";
import { getStore } from "@/lib/db";
import { config } from "@/lib/config";
import { formatUsdFromCents } from "@/lib/format";
import { ReportHeader } from "@/components/report/ReportHeader";
import { ListingIdentity } from "@/components/report/ListingIdentity";
import { StatCards } from "@/components/report/StatCards";
import { FixList, LockedFixPreview } from "@/components/report/FixList";
import { RewritesView } from "@/components/report/RewritesView";
import { MarketEvidence } from "@/components/report/MarketEvidence";
import PayButton from "@/components/PayButton";
import AuditProgress from "@/components/AuditProgress";

export const dynamic = "force-dynamic";

export default async function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const audit = await getStore().getAudit(id);
  if (!audit) notFound();

  // Async flow: while the background scorer runs (or if it failed), show the
  // progress screen instead of an empty report.
  if (audit.status !== "complete") {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <ReportHeader subtitle="Listing intelligence" />
        <section className="mt-8">
          <h1 className="text-3xl font-normal tracking-[-0.025em] text-ink">
            Your villa audit
          </h1>
        </section>
        <AuditProgress auditId={audit.id} />
      </main>
    );
  }

  const priceLabel = formatUsdFromCents(config.reportPriceUsdCents);
  const showFull = audit.paid || config.testingShowFullReport;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <ReportHeader subtitle="Listing intelligence" />

      <section className="mt-8">
        <h1 className="text-3xl font-normal tracking-[-0.025em] text-ink">
          Your villa audit
        </h1>
        <ListingIdentity
          title={audit.listing_title}
          photo={audit.listing_photo}
          airbnbUrl={audit.airbnb_url}
        />
        <p className="mt-3 text-sm text-fog">
          Compared against {audit.comp_basis}. Fixes ordered by impact.
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
        />
      </section>

      {showFull ? (
        <>
          {!audit.paid && config.testingShowFullReport && (
            <div className="mt-8 rounded-lg bg-sand px-4 py-2 text-center font-mono text-[11px] text-steel">
              Testing mode: full report shown without payment
              (OPTIRENT_TESTING_UNLOCK_ALL).
            </div>
          )}
          <section className="mt-12">
            <h2 className="mb-4 text-2xl font-normal tracking-[-0.025em] text-ink">
              Fix list
            </h2>
            <FixList fixes={audit.fixes} />
          </section>

          {audit.market_evidence && <MarketEvidence evidence={audit.market_evidence} />}

          <section className="mt-12">
            <h2 className="mb-4 text-2xl font-normal tracking-[-0.025em] text-ink">
              Paste-ready rewrites
            </h2>
            <RewritesView rewrites={audit.rewrites} />
          </section>

          <section className="mt-12 flex justify-center">
            <a
              href={`/report/${audit.id}?print=1`}
              className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper hover:bg-charcoal"
            >
              Download PDF report
            </a>
          </section>
        </>
      ) : (
        <section className="mt-12">
          <div className="rounded-2xl bg-cream px-8 py-6 text-center">
            <p className="text-lg font-medium text-ink">
              {audit.problem_count} issues found, {audit.critical_count} critical.
            </p>
            <p className="mt-1 text-sm text-fog">
              Unlock the full fix list, paste-ready rewrites, and a branded PDF.
            </p>
          </div>

          <h2 className="mt-10 mb-4 text-2xl font-normal tracking-[-0.025em] text-ink">
            Fix list (locked)
          </h2>
          <LockedFixPreview fixes={audit.fixes} />

          <div className="mt-8 flex flex-col items-center gap-3">
            <PayButton auditId={audit.id} priceLabel={priceLabel} />
            <p className="text-xs text-fog">
              One-time payment · We&apos;ll email your report link.
            </p>
          </div>
        </section>
      )}

    </main>
  );
}
