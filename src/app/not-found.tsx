import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata = { title: "Page not found - OptimoRent" };

/**
 * Branded 404 (pre-launch QA 2026-08-06: wrong URLs showed Next's bare
 * default). Also renders for notFound() on /result and /report, so the copy
 * covers dead or mistyped audit links too.
 */
export default function NotFound() {
  return (
    <div className="text-ink">
      <SiteNav cta={{ label: "Score my listing", href: "/" }} />
      <main className="mx-auto max-w-2xl px-6 py-24 text-center">
        <p className="mb-6 font-mono text-xs uppercase tracking-[0.2em] text-fog">404</p>
        <h1 className="text-3xl font-normal tracking-[-0.025em] sm:text-4xl">
          This page does not exist.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-steel">
          The link may be mistyped or out of date. If you were looking for a
          listing audit, the address from your email is the one that works.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-charcoal"
        >
          Back to OptimoRent
        </Link>
      </main>
      <SiteFooter line="Airbnb listing audit · Bali, Dubai and London" />
    </div>
  );
}
