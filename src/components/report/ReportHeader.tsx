/** OptiRent branded header used on the result page and the PDF report. */
export function ReportHeader({ subtitle }: { subtitle?: string }) {
  return (
    <header className="border-b border-dove pb-4">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xl font-medium tracking-[-0.02em] text-ink">OptiRent</div>
          <div className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.15em] text-pewter">
            Villa listing audit
          </div>
        </div>
        {subtitle && (
          <div className="text-right font-mono text-[11px] uppercase tracking-[0.15em] text-pewter">
            {subtitle}
          </div>
        )}
      </div>
    </header>
  );
}
