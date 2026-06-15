/** OptiRent branded header used on the result page and the PDF report. */
export function ReportHeader({ subtitle }: { subtitle?: string }) {
  return (
    <header className="border-b-2 border-brand-teal pb-4">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold text-brand-navy">OptiRent</div>
          <div className="text-sm text-brand-muted">
            Villa listing audit · a Réntlyn product
          </div>
        </div>
        {subtitle && (
          <div className="text-right text-sm text-brand-muted">{subtitle}</div>
        )}
      </div>
    </header>
  );
}
