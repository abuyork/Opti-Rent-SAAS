import type { Fix, Severity } from "@/lib/types";

const SEV_STYLE: Record<Severity, string> = {
  critical: "bg-sev-critical-bg text-sev-critical",
  high: "bg-sev-high-bg text-sev-high",
  medium: "bg-sev-medium-bg text-sev-medium",
};

export function SeverityTag({ severity }: { severity: Severity }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide ${SEV_STYLE[severity]}`}
    >
      {severity}
    </span>
  );
}

/**
 * Full fix list (paid). Each fix shows severity, title, detail, and comp basis.
 * Layout per manager QA 2026-07-16: severity tag on its own row so the title,
 * detail, and basis all share one left edge; title is a heading; basis reads at
 * body size behind a prominent mono BASIS label.
 */
export function FixList({ fixes }: { fixes: Fix[] }) {
  return (
    <div className="flex flex-col gap-3">
      {fixes.map((fix, i) => (
        <div
          key={i}
          className="pdf-block rounded-lg border border-dove px-5 py-4 text-left"
        >
          <SeverityTag severity={fix.severity} />
          <h3 className="mt-2.5 text-base font-medium leading-snug text-ink">
            {fix.title}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-steel">{fix.detail}</p>
          {fix.comp_basis && (
            <p className="mt-3 border-t border-dove/60 pt-3 text-sm leading-relaxed text-fog">
              <span className="mr-2 font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-ink">
                Basis
              </span>
              {fix.comp_basis}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Locked preview (free tier). Shows the count and severity mix but blurs the
 * fix content behind the paywall (Build Pack §7 "Locked preview of fixes").
 */
export function LockedFixPreview({ fixes }: { fixes: Fix[] }) {
  return (
    <div className="relative">
      <div className="pointer-events-none flex select-none flex-col gap-3 blur-sm">
        {fixes.slice(0, 4).map((fix, i) => (
          <div key={i} className="rounded-lg border border-dove px-5 py-4 text-left">
            <SeverityTag severity={fix.severity} />
            <span className="mt-2.5 block h-4 w-56 rounded bg-dove" />
            <span className="mt-2 block h-3 w-full rounded bg-dove" />
            <span className="mt-1.5 block h-3 w-4/5 rounded bg-dove" />
          </div>
        ))}
      </div>
    </div>
  );
}
