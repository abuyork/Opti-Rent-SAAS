import type { Metadata } from "next";
import Image from "next/image";
import { SiteNav } from "@/components/SiteNav";
import BuyPlaybookButton from "@/components/playbook/BuyPlaybookButton";
import { config } from "@/lib/config";
import { formatUsdFromCents } from "@/lib/format";
import {
  PLAYBOOKS,
  PLAYBOOK_KEYS,
  PLAYBOOK_CONTENTS,
  measuredTotalLabel,
  playbookCompSet,
} from "@/lib/playbooks";
import { getMarketBenchmark } from "@/lib/market/benchmarks";

export const metadata: Metadata = {
  title: "The Airbnb Playbook - what actually works in your market",
  description:
    "A market playbook built from live Airbnb data: what the top-earning listings do differently, measured against the bottom quartile, per size class. Bali, Dubai and London.",
};

/**
 * /playbook — sells the three branded market PDFs built in docs/playbook-src.
 * Three blocks only (Alex 2026-07-29, keep it compact): the story, what is
 * inside, and the buy block.
 *
 * Every figure comes from the same scan benchmarks the audit uses, so the page
 * and the books can never disagree. The proof strip quotes Greater Canggu 2BR
 * because that is a real measured contrast, labeled as such.
 */
export default function PlaybookLanding() {
  const price = formatUsdFromCents(config.playbookPriceUsdCents);
  const bench = getMarketBenchmark("greater-canggu", "2BR");
  const books = PLAYBOOK_KEYS.map((k) => PLAYBOOKS[k]);
  const totalPages = books.reduce((sum, b) => sum + b.pages, 0);

  const story = [
    {
      n: "01",
      title: "We scan the market, not the internet",
      body: "A live pull of active listings in one place: photos, titles, descriptions, amenities, rate, occupancy and trailing revenue. Not blog advice.",
    },
    {
      n: "02",
      title: "We split winners from laggards",
      body: "Inside each bedroom class we rank on revenue, occupancy and review quality, then compare top quartile against bottom. A tactic earns a page only if the two groups differ on it.",
    },
    {
      n: "03",
      title: "Every claim carries its number",
      body: "\"Add more photos\" is worthless. \"Winners run 43 photos, the bottom quartile runs 14\" is a decision.",
    },
  ];

  return (
    <div className="text-ink">
      <SiteNav
        links={[
          { label: "What's inside", href: "#inside" },
          { label: "Pick your market", href: "#buy" },
        ]}
        cta={{ label: "Get the playbook", href: "#buy" }}
        showPlaybookLink={false}
      />

      <main className="mx-auto max-w-5xl px-6">
        {/* Hero */}
        <section className="mx-auto max-w-3xl pt-16 pb-12 text-center sm:pt-20">
          <p className="mb-6 font-mono text-xs uppercase tracking-[0.2em] text-fog">
            The Airbnb Playbook
          </p>
          <h1 className="text-[38px] font-normal leading-[1.05] tracking-[-0.025em] sm:text-5xl sm:leading-[1.05]">
            Stop guessing what works.
            <br />
            <span className="text-fog">Somebody already measured it.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-steel">
            We scanned {measuredTotalLabel()} live Airbnb properties in depth and wrote down what
            separates the top earners from everyone else, size class by size class.{" "}
            {totalPages} pages across three books.
          </p>
          <a
            href="#buy"
            className="mt-8 inline-block rounded-full bg-ink px-7 py-3.5 text-sm font-medium text-paper hover:bg-charcoal"
          >
            Get your market&apos;s playbook · {price}
          </a>
          <p className="mt-5 font-mono text-[11px] uppercase tracking-wide text-pewter">
            One-time · PDF · Bali, Dubai and London
          </p>
        </section>

        {/* Proof: a real measured contrast from one page of the Bali book */}
        {bench && (
          <section className="pb-16">
            <div className="rounded-2xl bg-cream px-8 py-8">
              <p className="text-center font-mono text-[11px] uppercase tracking-[0.15em] text-pewter">
                One page of the Bali book · Greater Canggu, 2 bedrooms
              </p>
              <div className="mt-6 grid grid-cols-2 gap-6 text-center sm:grid-cols-4">
                <Contrast
                  label="Photos"
                  value={String(Math.round(bench.winner_median_photos))}
                  note={`vs ${Math.round(bench.loser_median_photos)} bottom quartile`}
                />
                <Contrast
                  label="Description"
                  value={bench.winner_median_description_chars.toLocaleString("en-US")}
                  unit="chars"
                  note={`vs ${bench.loser_median_description_chars} bottom quartile`}
                />
                <Contrast
                  label="Occupancy"
                  value={`${Math.round(bench.winner_median_occupancy * 100)}%`}
                  note="winner median"
                />
                <Contrast
                  label="Superhost"
                  value={`${Math.round(bench.winner_superhost_share * 100)}%`}
                  note="of winners"
                />
              </div>
            </div>
          </section>
        )}

        {/* The story */}
        <section className="border-t border-dove py-14">
          <h2 className="text-3xl font-normal tracking-[-0.025em] sm:text-4xl">
            Why this is not another listing-tips post
          </h2>
          <div className="mt-10 grid gap-10 sm:grid-cols-3">
            {story.map((s) => (
              <div key={s.n}>
                <div className="font-mono text-xs text-pewter">{s.n}</div>
                <h3 className="mt-2 text-lg font-medium">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fog">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* What you get */}
        <section id="inside" className="scroll-mt-24 border-t border-dove py-14">
          <h2 className="text-3xl font-normal tracking-[-0.025em] sm:text-4xl">
            What is inside every book
          </h2>
          <div className="mt-10 grid gap-x-12 gap-y-6 sm:grid-cols-2">
            {PLAYBOOK_CONTENTS.map((c, i) => (
              <div key={c.title} className="flex gap-4">
                <div className="mt-1 font-mono text-xs text-pewter">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div>
                  <h3 className="text-base font-medium">{c.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-fog">{c.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Buy */}
        <section id="buy" className="scroll-mt-24 border-t border-dove py-14">
          <h2 className="text-3xl font-normal tracking-[-0.025em] sm:text-4xl">
            Pick your market
          </h2>
          <p className="mt-3 max-w-2xl text-base text-fog">
            {price} each, one-time. A book only covers the market it was scanned in, because a
            Canggu cover shot does not win in London.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {books.map((b) => (
              <div key={b.key} className="flex flex-col rounded-2xl bg-cream p-8">
                <h3 className="text-2xl font-medium tracking-[-0.02em]">{b.place}</h3>
                <div className="mt-3 text-4xl tracking-[-0.025em]">{price}</div>
                <div className="mt-5 flex flex-col gap-1.5 text-sm text-steel">
                  <p>{b.pages} pages, PDF</p>
                  <p>
                    {playbookCompSet(b)} {b.noun} in the comp set
                  </p>
                  <p>{b.chapterLine}</p>
                </div>
                <div className="mt-auto">
                  <BuyPlaybookButton market={b.key} label={`Buy the ${b.place} Playbook`} />
                </div>
              </div>
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

function Contrast({
  label,
  value,
  unit,
  note,
}: {
  label: string;
  value: string;
  unit?: string;
  note: string;
}) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-wide text-pewter">{label}</div>
      <div className="mt-1.5 text-3xl tracking-[-0.025em] text-ink">
        {value}
        {unit && <span className="ml-1 text-base text-fog">{unit}</span>}
      </div>
      <div className="mt-1 text-sm text-fog">{note}</div>
    </div>
  );
}
