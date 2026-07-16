"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/http";

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
      const data = await postJson<{ id: string }>("/api/audit", {
        url: url.trim(),
        email: email.trim(),
      });
      router.push(`/result/${data.id}`);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto mt-10 flex w-full max-w-xl flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-dove border-t-ink" />
        <p className="text-sm text-fog">
          Scoring your villa against comparable listings…
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-xl">
      {step === "url" ? (
        <form onSubmit={onUrlSubmit} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            placeholder="https://www.airbnb.com/rooms/..."
            className="flex-1 rounded-md border border-dove bg-paper px-4 py-3 text-base text-ink outline-none placeholder:text-pewter focus:border-ink focus:ring-1 focus:ring-ink"
          />
          <button
            type="submit"
            className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-charcoal"
          >
            Score my villa
          </button>
        </form>
      ) : (
        <form onSubmit={onEmailSubmit} className="flex flex-col gap-3">
          <p className="text-left text-sm text-fog">
            Where should we send your report? Your score shows on the next screen.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="you@example.com"
              className="flex-1 rounded-md border border-dove bg-paper px-4 py-3 text-base text-ink outline-none placeholder:text-pewter focus:border-ink focus:ring-1 focus:ring-ink"
            />
            <button
              type="submit"
              className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-charcoal"
            >
              Get my free score
            </button>
          </div>
          <button
            type="button"
            onClick={() => setStep("url")}
            className="self-start font-mono text-[11px] uppercase tracking-wide text-fog hover:text-ink"
          >
            ← Change URL
          </button>
        </form>
      )}

      {error && <p className="mt-3 text-sm text-sev-critical">{error}</p>}
    </div>
  );
}
