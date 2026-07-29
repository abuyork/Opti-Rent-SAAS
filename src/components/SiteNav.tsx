import Image from "next/image";
import Link from "next/link";

export interface NavLink {
  label: string;
  href: string;
}

/**
 * Sticky site nav, shared by the landing pages and the playbook pages so the
 * "New" badge and the brand mark live in one place.
 *
 * `links` are page-specific (the landing pages pass their in-page anchors,
 * which do not exist elsewhere). The playbook entry carries the badge, and is
 * hidden with `showPlaybookLink={false}` on the playbook page itself — a nav
 * item pointing at the page you are already on is dead weight.
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
            <Link
              href="/playbook"
              className="relative text-sm font-medium text-fog hover:text-ink"
            >
              Airbnb Playbook
              <span className="absolute -right-6 -top-2 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-ember">
                New
              </span>
            </Link>
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
