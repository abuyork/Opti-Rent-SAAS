import Image from "next/image";

/** OptimoRent branded header used on the result page and the PDF report. */
export function ReportHeader({ subtitle }: { subtitle?: string }) {
  return (
    <header className="border-b border-dove pb-4">
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <Image
              src="/logo/optimorent-mark-ink.png"
              alt="OptimoRent monogram"
              width={38}
              height={24}
            />
            <span className="text-xl font-medium tracking-[-0.02em] text-ink">OptimoRent</span>
          </div>
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
