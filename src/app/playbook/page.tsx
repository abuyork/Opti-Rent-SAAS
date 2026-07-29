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
  playbookCompSet,
  playbookMeasured,
} from "@/lib/playbooks";
import { getMarketBenchmark } from "@/lib/market/benchmarks";

export const metadata: Metadata = {
  title: "The Airbnb Playbook - what actually works in your market",
  description:
    "A market playbook built from live Airbnb data: what the top-earning listings do differently, measured against the bottom quartile, per size class. Bali, Dubai and London.",
};

/**
 * /playbook — sells the three branded market PDFs built in docs/playbook-src.
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
  const totalMeasured = books.reduce((sum, b) => sum + playbookMeasured(b), 0);

  const story = [
    {
      n: "01",
      title: "We scan the market, not the internet",
      body: "Every book starts with a live pull of active Airbnb listings in one place: their photos, titles, descriptions, amenities, nightly rate, occupancy and trailing-twelve-month revenue. Not blog advice. Not what worked in 2019.",
    },
    {
      n: "02",
      title: "We split the winners from the laggards",
      body: "Inside each bedroom class we rank listings on a blend of revenue per available night, occupancy and review quality, then compare the top quartile against the bottom. A tactic only earns a page if the two groups actually differ on it.",
    },
    {
      n: "03",
      title: "Every claim carries its number",
      body: "\"Add more photos\" is worthless. \"Winners in your class run 43 photos, the bottom quartile runs 14\" is a decision. Every finding in the book cites the measured gap and names the listings on both sides.",
    },
  ];

  return (
    <div className="text-ink">
      <SiteNav links={[{ label: "What's inside", href: "#inside" }]} cta={{ label: "Get the playbook", href: "#buy" }} />

      <main className="mx-auto max-w-5xl px-6">
        {/* Hero */}
        <section className="mx-auto max-w-3xl pt-20 pb-16 text-center sm:pt-28">
          <p className="mb-8 font-mono text-xs uppercase tracking-[0.2em] text-fog">
            The Airbnb Playbook
          </p>
          <h1 className="text-[42px] font-normal leading-[1.04] tracking-[-0.025em] sm:text-6xl sm:leading-[1.0]">
            Stop guessing what works.
            <br />
            <span className="text-fog">Somebody already measured it.</span>
          </h1>
          <p className="mx-auto mt-8 max-w-xl text-base leading-relaxed text-steel">
            We scanned {totalMeasured.toLocaleString("en-US")} live Airbnb listings in depth and
            wrote down exactly what separates the top earners from everyone else in each market,
            size class by size class. It runs {totalPages} pages across three books.
          </p>
          <a
            href="#buy"
            className="mt-10 inline-block rounded-full bg-ink px-7 py-3.5 text-sm font-medium text-paper hover:bg-charcoal"
          >
            Get your market&apos;s playbook · {price}
          </a>
          <p className="mt-6 font-mono text-[11px] uppercase tracking-wide text-pewter">
            One-time · PDF · Bali, Dubai and London
          </p>
        </section>

        {/* Proof strip: a real measured contrast */}
        {bench && (
          <section className="pb-24">
            <div className="rounded-2xl bg-cream px-8 py-10">
              <p className="text-center font-mono text-[11px] uppercase tracking-[0.15em] text-pewter">
                One page of the Bali book · Greater Canggu, 2 bedrooms
              </p>
              <div className="mt-8 grid grid-cols-2 gap-6 text-center sm:grid-cols-4">
                <Contrast
                  label="Photos"
                  winner={String(Math.round(bench.winner_median_photos))}
                  loser={String(Math.round(bench.loser_median_photos))}
                />
                <Contrast
                  label="Description"
                  winner={`${bench.winner_median_description_chars.toLocaleString("en-US")}`}
                  loser={`${bench.loser_median_description_chars.toLocaleString("en-US")}`}
                  unit="chars"
                />
                <Contrast
                  label="Occupancy"
                  winner={`${Math.round(bench.winner_median_occupancy * 100)}%`}
                  loser="—"
                  note="winner median"
                />
                <Contrast
                  label="Superhost"
                  winner={`${Math.round(bench.winner_superhost_share * 100)}%`}
                  loser="—"
                  note="of winners"
                />
              </div>
              <p className="mt-8 text-center text-sm leading-relaxed text-steel">
                That is one cohort on one page. Each book carries this contrast for every bedroom
                class, plus the cover shots, titles, descriptions and amenities that produced it.
              </p>
            </div>
          </section>
        )}

        {/* The story */}
        <section className="border-t border-dove py-20">
          <h2 className="text-3xl font-normal tracking-[-0.025em] sm:text-4xl">
            Why this is not another listing-tips post
          </h2>
          <p className="mt-3 max-w-2xl text-base text-fog">
            Most advice for hosts is somebody&apos;s opinion, repeated. This is a measurement of
            your actual market, taken this year.
          </p>
          <div className="mt-12 grid gap-10 sm:grid-cols-3">
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
        <section id="inside" className="scroll-mt-24 border-t border-dove py-20">
          <h2 className="text-3xl font-normal tracking-[-0.025em] sm:text-4xl">
            What is inside every book
          </h2>
          <p className="mt-3 max-w-2xl text-base text-fog">
            Eight chapters, in the order you should act on them.
          </p>
          <div className="mt-12 grid gap-x-12 gap-y-8 sm:grid-cols-2">
            {PLAYBOOK_CONTENTS.map((c, i) => (
              <div key={c.title} className="flex gap-4">
                <div className="mt-0.5 font-mono text-xs text-pewter">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div>
                  <h3 className="text-base font-medium">{c.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-fog">{c.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Buy */}
        <section id="buy" className="scroll-mt-24 border-t border-dove py-20">
          <h2 className="text-3xl font-normal tracking-[-0.025em] sm:text-4xl">
            Pick your market
          </h2>
          <p className="mt-3 max-w-2xl text-base text-fog">
            {price} each, one-time. A book only covers the market it was scanned in, because a
            Canggu cover shot does not win in London.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {books.map((b) => (
              <div key={b.key} className="flex flex-col rounded-2xl bg-cream p-8">
                <h3 className="text-2xl font-medium tracking-[-0.02em]">{b.place}</h3>
                <div className="mt-4 text-4xl tracking-[-0.025em]">{price}</div>
                <div className="mt-6 flex flex-col gap-1.5 text-sm text-steel">
                  <p>{b.pages} pages, PDF</p>
                  <p>{playbookCompSet(b)} {b.noun} in the comp set</p>
                  <p>{playbookMeasured(b).toLocaleString("en-US")} measured in depth</p>
                  <p>{b.chapterLine}</p>
                </div>
                <div className="mt-auto">
                  <BuyPlaybookButton market={b.key} label={`Buy the ${b.place} Playbook`} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-8 font-mono text-[11px] uppercase tracking-wide text-pewter">
            Scanned {books[0].scanned} · Delivered as a download the moment you pay
          </p>
        </section>

        {/* Honest limits */}
        <section className="border-t border-dove py-20">
          <h2 className="text-3xl font-normal tracking-[-0.025em] sm:text-4xl">
            What it is not
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            <Limit heading="Not a revenue guarantee">
              It measures what the top earners in your market do. Copying them is a much better
              bet than guessing, but nobody can promise you a number.
            </Limit>
            <Limit heading="Not about your listing">
              The playbook is the market. If you want your own listing scored and fixed, that is
              the audit, and the free score costs nothing.
            </Limit>
            <Limit heading="Not a live dashboard">
              It is a snapshot taken when we scanned, {books[0].scanned}. Markets move slowly at
              this level, but the numbers carry a date for a reason.
            </Limit>
          </div>
          <a
            href="/"
            className="mt-10 inline-block rounded-full px-6 py-3 text-sm font-medium text-ink shadow-[0_0_0_1px_rgba(10,10,10,0.15)] hover:bg-cream"
          >
            Score my listing free instead
          </a>
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
  winner,
  loser,
  unit,
  note,
}: {
  label: string;
  winner: string;
  loser: string;
  unit?: string;
  note?: string;
}) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-wide text-pewter">{label}</div>
      <div className="mt-2 text-3xl tracking-[-0.025em] text-ink">
        {winner}
        {unit && <span className="ml-1 text-base text-fog">{unit}</span>}
      </div>
      <div className="mt-1 text-sm text-fog">
        {note ?? (loser === "—" ? "" : `vs ${loser} for the bottom quartile`)}
      </div>
    </div>
  );
}

function Limit({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-cream p-8">
      <h3 className="text-base font-medium">{heading}</h3>
      <p className="mt-2 text-sm leading-relaxed text-fog">{children}</p>
    </div>
  );
}
