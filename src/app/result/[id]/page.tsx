import { notFound } from "next/navigation";
import { getStore } from "@/lib/db";
import { config } from "@/lib/config";
import { formatUsdFromCents } from "@/lib/format";
import { hasFullReportAccess } from "@/lib/access";
import { ReportHeader } from "@/components/report/ReportHeader";
import { ListingIdentity } from "@/components/report/ListingIdentity";
import { StatCards } from "@/components/report/StatCards";
import { cohortTotalFor } from "@/lib/market/benchmarks";
import { comparedAgainstLine } from "@/lib/report-copy";
import { FixList, LockedFixPreview } from "@/components/report/FixList";
import { RewritesView } from "@/components/report/RewritesView";
import { MarketEvidence } from "@/components/report/MarketEvidence";
import PayButton from "@/components/PayButton";
import AuditProgress from "@/components/AuditProgress";
import TrackEvent from "@/components/TrackEvent";
import { gaValue } from "@/lib/analytics";

export const dynamic = "force-dynamic";

// Owners print this page directly too — same browser-header concern as
// /report, so it gets a document title that reads like a report.
export const metadata = { title: "Your listing audit - OptimoRent" };

export default async function ResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  /** purchased=1 is set only by /api/unlock's post-payment redirect. */
  searchParams: Promise<{ purchased?: string }>;
}) {
  const { id } = await params;
  const { purchased } = await searchParams;
  const audit = await getStore().getAudit(id);
  if (!audit) notFound();

  // Async flow: while the background scorer runs (or if it failed), show the
  // progress screen instead of an empty report.
  if (audit.status !== "complete") {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <ReportHeader />
        <section className="mt-8">
          <h1 className="text-3xl font-normal tracking-[-0.025em] text-ink">
            Your listing audit
          </h1>
        </section>
        <AuditProgress auditId={audit.id} />
      </main>
    );
  }

  const priceLabel = formatUsdFromCents(config.reportPriceUsdCents);
  const showFull = hasFullReportAccess(audit);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      {/* Revenue lands here, once: /api/unlock adds purchased=1 only after
          Stripe confirms the session, so a comped or repeat view of an
          already-unlocked report never counts as a sale. The audit id is the
          transaction id, which is how GA4 discards a refresh. */}
      {purchased === "1" && audit.paid && (
        <TrackEvent
          event="purchase"
          params={{
            transaction_id: audit.id,
            currency: "USD",
            value: gaValue(config.reportPriceUsdCents),
            items: [{ item_id: "audit_report", item_name: "Full listing audit" }],
          }}
        />
      )}
      {!showFull && <TrackEvent event="paywall_viewed" params={{ audit_id: audit.id }} />}
      <ReportHeader />

      <section className="mt-8">
        <h1 className="text-3xl font-normal tracking-[-0.025em] text-ink">
          Your listing audit
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

          <section className="no-print mt-12 flex justify-center">
            <a
              href={`/report/${audit.id}?print=1`}
              className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-charcoal"
            >
              Download PDF report
            </a>
          </section>
        </>
      ) : (
        <section className="mt-12">
          <div className="rounded-2xl bg-cream px-8 py-6 text-center">
            <p className="text-lg font-medium text-ink">
              {audit.problem_count} issue{audit.problem_count === 1 ? "" : "s"} found,{" "}
              {audit.critical_count} critical.
            </p>
            <p className="mt-1 text-sm text-fog">
              Unlock the full fix list, paste-ready rewrites, and a branded PDF.
            </p>
          </div>

          <h2 className="mt-10 mb-4 text-2xl font-normal tracking-[-0.025em] text-ink">
            Preview (fix list)
          </h2>
          <LockedFixPreview fixes={audit.fixes} />

          <div className="no-print mt-8 flex flex-col items-center gap-3">
            <PayButton
              auditId={audit.id}
              priceLabel={priceLabel}
              priceUsdCents={config.reportPriceUsdCents}
            />
            <p className="text-xs text-fog">
              One-time payment · We&apos;ll email your report link.
            </p>
          </div>
        </section>
      )}

      <footer className="mt-12 border-t border-dove pt-4 text-center">
        <div className="font-mono text-[11px] uppercase tracking-[0.15em] text-pewter">
          Questions about your score?
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
