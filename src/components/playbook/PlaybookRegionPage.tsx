import Image from "next/image";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import BuyPlaybookButton from "@/components/playbook/BuyPlaybookButton";
import { config } from "@/lib/config";
import { formatUsdFromCents } from "@/lib/format";
import { PLAYBOOK_CONTENTS, playbookCompSet } from "@/lib/playbooks";
import type { PlaybookScope, ProofTile } from "@/lib/playbook-landing";

/**
 * Shared layout for the three region playbook pages (/playbook/<market>).
 * Same three blocks as the original single page (Alex 2026-07-29: story, what
 * is inside, buy) — but every line and every number is this region's own,
 * supplied by the scope. The nav keeps the playbook dropdown so a reader who
 * landed on the wrong region can switch without going back to the hub.
 */
export function PlaybookRegionPage({ scope }: { scope: PlaybookScope }) {
  const { book } = scope;
  const price = formatUsdFromCents(config.playbookPriceUsdCents);

  return (
    <div className="text-ink">
      <SiteNav
        links={[
          { label: "What's inside", href: "#inside" },
          { label: "Buy", href: "#buy" },
        ]}
        cta={{ label: `Get the ${book.place} Playbook`, href: "#buy" }}
      />

      <main className="mx-auto max-w-5xl px-6">
        {/* Hero */}
        <section className="mx-auto max-w-3xl pt-16 pb-12 text-center sm:pt-20">
          <p className="mb-6 font-mono text-xs uppercase tracking-[0.2em] text-fog">
            {scope.kicker}
          </p>
          <h1 className="text-[38px] font-normal leading-[1.05] tracking-[-0.025em] sm:text-5xl sm:leading-[1.05]">
            {scope.heroHeadline}
            <br />
            <span className="text-fog">Somebody already measured it.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-steel">
            {scope.heroSub}
          </p>
          <a
            href="#buy"
            className="mt-8 inline-block rounded-full bg-ink px-7 py-3.5 text-sm font-medium text-paper hover:bg-charcoal"
          >
            Get the {book.place} Playbook · {price}
          </a>
          <p className="mt-5 font-mono text-[11px] uppercase tracking-wide text-pewter">
            {scope.heroFootnote}
          </p>
        </section>

        {/* Proof: a real measured contrast from one page of this book */}
        {scope.proofTiles.length > 0 && (
          <section className="pb-16">
            <div className="rounded-2xl bg-cream px-8 py-8">
              <p className="text-center font-mono text-[11px] uppercase tracking-[0.15em] text-pewter">
                {scope.proofLabel}
              </p>
              <div className="mt-6 grid grid-cols-2 gap-6 text-center sm:grid-cols-4">
                {scope.proofTiles.map((t) => (
                  <Contrast key={t.label} {...t} />
                ))}
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
            {scope.story.map((s) => (
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
            What is inside {book.title}
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
            Get {book.title}
          </h2>
          <p className="mt-3 max-w-2xl text-base text-fog">{scope.buyBlurb}</p>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            <div className="flex flex-col rounded-2xl bg-cream p-8 sm:col-span-2 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
              <div>
                <h3 className="text-2xl font-medium tracking-[-0.02em]">{book.place}</h3>
                <div className="mt-3 text-4xl tracking-[-0.025em]">{price}</div>
                <div className="mt-5 flex flex-col gap-1.5 text-sm text-steel">
                  <p>{book.pages} pages, PDF, one-time</p>
                  <p>
                    {playbookCompSet(book)} {book.noun} in the comp set
                  </p>
                  <p>{book.chapterLine}</p>
                </div>
              </div>
              <div className="sm:w-64">
                <BuyPlaybookButton market={book.key} label={`Buy the ${book.place} Playbook`} />
              </div>
            </div>
            <div className="flex flex-col justify-center rounded-2xl p-8 shadow-[0_0_0_1px_rgba(10,10,10,0.08)]">
              <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-pewter">
                Not your market?
              </p>
              <div className="mt-4 flex flex-col gap-2">
                {scope.otherMarkets.map((m) => (
                  <Link
                    key={m.href}
                    href={m.href}
                    className="text-sm font-medium text-fog hover:text-ink"
                  >
                    The {m.label} Playbook →
                  </Link>
                ))}
              </div>
            </div>
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
              {scope.footerLine}
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

function Contrast({ label, value, unit, note }: ProofTile) {
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
