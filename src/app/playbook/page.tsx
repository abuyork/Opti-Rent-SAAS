import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { config } from "@/lib/config";
import { formatUsdFromCents } from "@/lib/format";
import {
  PLAYBOOKS,
  PLAYBOOK_KEYS,
  measuredTotalLabel,
  playbookCompSet,
} from "@/lib/playbooks";

export const metadata: Metadata = {
  title: "The Airbnb Playbook - pick your market",
  description:
    "One book per market: what the top-earning Airbnb listings do differently, measured against the bottom quartile, per size class. Pick Bali, Dubai or London.",
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
      <SiteNav showPlaybookLink={false} />

      <main className="mx-auto max-w-5xl px-6">
        <section className="mx-auto max-w-3xl pt-16 pb-12 text-center sm:pt-24">
          <p className="mb-6 font-mono text-xs uppercase tracking-[0.2em] text-fog">
            The Airbnb Playbook
          </p>
          <h1 className="text-[38px] font-normal leading-[1.05] tracking-[-0.025em] sm:text-5xl sm:leading-[1.05]">
            Stop guessing what works.
            <br />
            <span className="text-fog">Somebody already measured it.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-steel">
            We scanned {measuredTotalLabel()} live Airbnb properties in depth and wrote one book
            per market: what the top earners do differently, measured against the bottom
            quartile, size class by size class. Pick where you host.
          </p>
          <p className="mt-5 font-mono text-[11px] uppercase tracking-wide text-pewter">
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
                <p className="mt-6 font-mono text-[11px] uppercase tracking-wide text-fog group-hover:text-ink">
                  The {b.place} Playbook →
                </p>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-dove">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Image
                src="/logo/optimorent-mark-ink.png"
                alt="OptimoRent monogram"
                width={31}
                height={20}
              />
              <span className="text-base font-medium tracking-[-0.02em]">OptimoRent</span>
            </div>
            <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.15em] text-pewter">
              The Airbnb Playbook · Bali, Dubai and London
            </div>
          </div>
          <div className="flex flex-col gap-1 sm:items-end">
            <a
              href={`mailto:${config.email.contact}`}
              className="text-sm text-fog underline decoration-dove underline-offset-2 hover:text-ink hover:decoration-ink"
            >
              {config.email.contact}
            </a>
            <p className="text-xs text-pewter">© 2026 OptimoRent</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
