import Image from "next/image";
import { config } from "@/lib/config";

/**
 * Shared site footer, previously copy-pasted into LandingPage,
 * PlaybookRegionPage and the playbook hub (and missing from /playbook/thanks).
 * Only the mono tagline under the brand differs per page, so that is the one
 * prop. The report/result pages keep their own minimal document footer — they
 * are printable documents, not site pages.
 */
export function SiteFooter({ line }: { line: string }) {
  return (
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
            {line}
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
  );
}
