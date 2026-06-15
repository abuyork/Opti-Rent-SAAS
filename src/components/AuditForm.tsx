"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Step = "url" | "email";

/**
 * Public audit entry: paste URL → email gate → loading → redirect to result.
 * Mirrors Build Pack §7: "paste URL → loading → free result. Email before result."
 */
export default function AuditForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("url");
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^https?:\/\//i.test(url.trim())) {
      setError("Enter a valid Airbnb listing URL.");
      return;
    }
    setStep("email");
  }

  async function onEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      router.push(`/result/${data.id}`);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="mt-10 flex w-full max-w-xl flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-line border-t-brand-teal" />
        <p className="text-sm text-brand-muted">
          Scoring your villa against comparable listings…
        </p>
      </div>
    );
  }

  return (
    <div className="mt-10 w-full max-w-xl">
      {step === "url" ? (
        <form onSubmit={onUrlSubmit} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            placeholder="https://www.airbnb.com/rooms/..."
            className="flex-1 rounded-lg border border-brand-line bg-white px-4 py-3 text-base text-brand-ink outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/30"
          />
          <button
            type="submit"
            className="rounded-lg bg-brand-navy px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-navy-soft"
          >
            Score my villa
          </button>
        </form>
      ) : (
        <form onSubmit={onEmailSubmit} className="flex flex-col gap-3">
          <p className="text-left text-sm text-brand-muted">
            Where should we send your report? You&apos;ll see your score on the next screen.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="you@example.com"
              className="flex-1 rounded-lg border border-brand-line bg-white px-4 py-3 text-base text-brand-ink outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/30"
            />
            <button
              type="submit"
              className="rounded-lg bg-brand-teal px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-teal-soft"
            >
              Get my free score
            </button>
          </div>
          <button
            type="button"
            onClick={() => setStep("url")}
            className="self-start text-xs text-brand-muted underline"
          >
            ← change URL
          </button>
        </form>
      )}

      {error && <p className="mt-3 text-sm text-sev-critical">{error}</p>}
    </div>
  );
}
