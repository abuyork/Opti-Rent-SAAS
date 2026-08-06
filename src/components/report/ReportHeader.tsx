import Image from "next/image";
import Link from "next/link";

/**
 * OptimoRent branded header used on the result page and the PDF report.
 * The brand is a link home — the report pages had no way back to the site
 * (Alex, 2026-08-06). Prints unchanged: a link renders as plain brand text.
 * No right-side label: the "Listing intelligence" mirror read as clutter
 * (Max, 2026-08-06).
 */
export function ReportHeader() {
  return (
    <header className="border-b border-dove pb-4">
      <Link href="/" className="flex items-center gap-2.5">
        <Image
          src="/logo/optimorent-mark-ink.png"
          alt="OptimoRent monogram"
          width={38}
          height={24}
        />
        <span className="text-xl font-medium tracking-[-0.02em] text-ink">OptimoRent</span>
      </Link>
      <div className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.15em] text-pewter">
        Airbnb listing audit
      </div>
    </header>
  );
}
