import Image from "next/image";
import Link from "next/link";
import { PLAYBOOKS, PLAYBOOK_KEYS } from "@/lib/playbooks";

export interface NavLink {
  label: string;
  href: string;
}

/**
 * Sticky site nav, shared by the landing pages and the playbook pages so the
 * "New" badge and the brand mark live in one place.
 *
 * `links` are page-specific (the landing pages pass their in-page anchors,
 * which do not exist elsewhere). The playbook entry carries the badge and a
 * CSS-only hover/focus dropdown of the three region pages (Max ask
 * 2026-08-03). The trigger itself deliberately navigates nowhere (Alex
 * 2026-08-03: no default playbook page from the nav — the reader must pick a
 * market). It is hidden with `showPlaybookLink={false}` on the /playbook hub.
 */
export function SiteNav({
  logoHref = "/",
  links = [],
  cta,
  showPlaybookLink = true,
}: {
  logoHref?: string;
  links?: NavLink[];
  cta?: { label: string; href: string };
  showPlaybookLink?: boolean;
}) {
  return (
    <nav className="sticky top-0 z-50 border-b border-dove/70 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <a href={logoHref} className="flex items-center gap-2.5">
          <Image
            src="/logo/optimorent-mark-ink.png"
            alt="OptimoRent monogram"
            width={38}
            height={24}
            priority
          />
          <span className="text-lg font-medium tracking-[-0.02em]">OptimoRent</span>
        </a>

        <div className="hidden items-center gap-6 sm:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-fog hover:text-ink">
              {l.label}
            </a>
          ))}
          {showPlaybookLink && (
            <div className="group relative">
              <button
                type="button"
                aria-haspopup="menu"
                className="relative flex cursor-default items-center gap-1 text-sm font-medium text-fog hover:text-ink"
              >
                Airbnb Playbook
                <span aria-hidden className="text-[10px] text-pewter">
                  ▾
                </span>
                <span className="absolute -right-5 -top-2 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-ember">
                  New
                </span>
              </button>
              {/* pt-2 keeps the hover surface contiguous between trigger and menu */}
              <div className="invisible absolute right-0 top-full pt-2 opacity-0 transition-opacity duration-100 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                <div className="flex w-44 flex-col rounded-xl border border-dove bg-paper p-1.5 shadow-[0_12px_32px_rgba(10,10,10,0.10)]">
                  {PLAYBOOK_KEYS.map((k) => (
                    <Link
                      key={k}
                      href={`/playbook/${k}`}
                      className="rounded-lg px-3 py-2 text-sm font-medium text-fog hover:bg-cream hover:text-ink"
                    >
                      {PLAYBOOKS[k].place}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {cta && (
          <a
            href={cta.href}
            className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-charcoal"
          >
            {cta.label}
          </a>
        )}
      </div>
    </nav>
  );
}
