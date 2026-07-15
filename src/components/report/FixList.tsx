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

/** Full fix list (paid). Each fix shows severity, title, detail, and comp basis. */
export function FixList({ fixes }: { fixes: Fix[] }) {
  return (
    <div className="flex flex-col gap-3">
      {fixes.map((fix, i) => (
        <div
          key={i}
          className="pdf-block rounded-lg border border-dove px-4 py-3 text-left"
        >
          <div className="flex items-start gap-2">
            <SeverityTag severity={fix.severity} />
            <p className="text-sm leading-relaxed text-ink">
              <span className="font-medium">{fix.title}.</span> {fix.detail}
            </p>
          </div>
          {fix.comp_basis && (
            <p className="mt-2 pl-1 font-mono text-[11px] text-pewter">
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
          <div key={i} className="rounded-lg border border-dove px-4 py-3 text-left">
            <div className="flex items-center gap-2">
              <SeverityTag severity={fix.severity} />
              <span className="h-3 w-48 rounded bg-dove" />
            </div>
            <span className="mt-2 block h-3 w-full rounded bg-dove" />
          </div>
        ))}
      </div>
    </div>
  );
}
