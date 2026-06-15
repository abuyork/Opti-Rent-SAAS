import type { Fix, Severity } from "@/lib/types";

const SEV_STYLE: Record<Severity, string> = {
  critical: "bg-sev-critical-bg text-sev-critical",
  high: "bg-sev-high-bg text-sev-high",
  medium: "bg-sev-medium-bg text-sev-medium",
};

export function SeverityTag({ severity }: { severity: Severity }) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-semibold capitalize ${SEV_STYLE[severity]}`}
    >
      {severity}
    </span>
  );
}

/** Full fix list (paid). Each fix shows severity, title, detail, and comp basis. */
export function FixList({ fixes }: { fixes: Fix[] }) {
  return (
    <div className="flex flex-col gap-3">
      {fixes.map((fix, i) => (
        <div
          key={i}
          className="pdf-block rounded-lg border border-brand-line px-4 py-3 text-left"
        >
          <div className="flex items-start gap-2">
            <SeverityTag severity={fix.severity} />
            <p className="text-sm leading-relaxed text-brand-ink">
              <span className="font-semibold">{fix.title}.</span> {fix.detail}
            </p>
          </div>
          {fix.comp_basis && (
            <p className="mt-1.5 pl-1 text-xs italic text-brand-muted">
              Basis: {fix.comp_basis}
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
          <div key={i} className="rounded-lg border border-brand-line px-4 py-3 text-left">
            <div className="flex items-center gap-2">
              <SeverityTag severity={fix.severity} />
              <span className="h-3 w-48 rounded bg-brand-line" />
            </div>
            <span className="mt-2 block h-3 w-full rounded bg-brand-line" />
          </div>
        ))}
      </div>
    </div>
  );
}
