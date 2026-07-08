import AuditForm from "@/components/AuditForm";

/**
 * Landing / public audit entry page (Build Pack §7 "Public audit page").
 * Hero + interactive audit flow (URL → email gate → loading → free result).
 */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
      <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-brand-teal">
        OptiRent
      </p>

      <h1 className="text-4xl font-bold leading-tight text-brand-navy sm:text-5xl">
        Your villa is leaving money on the table.
        <br />
        <span className="text-brand-teal">We help you take it back.</span>
      </h1>

      <p className="mt-6 max-w-xl text-lg text-brand-muted">
        Paste your Airbnb villa URL and get a free listing score, an underpricing
        estimate against comparable villas, and a problem count — in seconds.
      </p>

      <AuditForm />

      <p className="mt-4 text-xs text-brand-muted">
        Free score · No account needed · Bali · Canggu-first
      </p>
    </main>
  );
}
