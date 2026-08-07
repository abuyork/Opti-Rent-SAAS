import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav, SITE_LINKS } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { config } from "@/lib/config";
import { formatUsdFromCents } from "@/lib/format";
import {
  PLAYBOOKS,
  PLAYBOOK_KEYS,
  measuredTotalLabel,
  playbookCompSet,
} from "@/lib/playbooks";

export const metadata: Metadata = {
  title: "Airbnb Playbook 26/27 - pick your market",
  description:
    "One book per market: what the top-earning Airbnb listings do differently, measured against the bottom 25%, per size class. Pick Bali, Dubai or London.",
};

/**
 * /playbook — the picker hub (Max ask 2026-08-03): a hero and three buttons,
 * nothing else. All selling happens on the region pages (/playbook/<market>),
 * where every line and number is that region's own.
 */
export default function PlaybookHub() {
  const price = formatUsdFromCents(config.playbookPriceUsdCents);
  const books = PLAYBOOK_KEYS.map((k) => PLAYBOOKS[k]);

  return (
    <div className="text-ink">
      {/* The hub has no sections of its own, so without the main menu its nav
          is a bare logo — the same hole as the download page (Max 2026-08-07).
          The playbook dropdown stays hidden: the reader is already on it. */}
      <SiteNav
        links={SITE_LINKS}
        cta={{ label: "Score my listing", href: "/#audit" }}
        showPlaybookLink={false}
      />

      <main className="mx-auto max-w-5xl px-6">
        <section className="mx-auto max-w-3xl pt-16 pb-12 text-center sm:pt-24">
          <p className="mb-6 font-mono text-xs uppercase tracking-[0.2em] text-fog">
            Airbnb Playbook 26/27
          </p>
          <h1 className="text-[38px] font-normal leading-[1.05] tracking-[-0.025em] sm:text-5xl sm:leading-[1.05]">
            Stop guessing what works.
            <br />
            <span className="text-fog">Somebody already measured it.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-steel">
            We scanned {measuredTotalLabel()} live Airbnb properties in depth and wrote one book
            per market: what the top earners do differently, measured against the bottom
            25%, size class by size class. Pick where you host.
          </p>
          <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.15em] text-pewter">
            {price} per market · One-time · PDF
          </p>
        </section>

        <section className="pb-24">
          <div className="grid gap-6 sm:grid-cols-3">
            {books.map((b) => (
              <Link
                key={b.key}
                href={`/playbook/${b.key}`}
                className="group rounded-2xl bg-cream p-8 transition-shadow hover:shadow-[0_0_0_1px_rgba(10,10,10,0.15)]"
              >
                <h2 className="text-2xl font-medium tracking-[-0.02em]">{b.place}</h2>
                <div className="mt-4 flex flex-col gap-1">
                  <p className="text-sm text-steel">{b.pages} pages, PDF</p>
                  <p className="text-sm text-steel">
                    {playbookCompSet(b)} {b.noun} in the comp set
                  </p>
                </div>
                <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.15em] text-fog group-hover:text-ink">
                  Airbnb Playbook 26/27 →
                </p>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter line="Airbnb Playbook 26/27 · Bali, Dubai and London" />
    </div>
  );
}
