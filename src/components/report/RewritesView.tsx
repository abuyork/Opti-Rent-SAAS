"use client";

import { useState } from "react";
import type { Rewrites } from "@/lib/types";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="no-print rounded border border-brand-line px-2 py-1 text-xs font-medium text-brand-teal hover:bg-brand-card"
    >
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}

function Block({ label, before, after }: { label: string; before: string; after: string }) {
  return (
    <div className="rounded-lg border border-brand-line p-4 text-left">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-brand-navy">{label}</h4>
        <CopyButton text={after} />
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-brand-muted">Before</p>
      <p className="text-sm text-brand-muted line-through">{before}</p>
      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-brand-muted">After</p>
      <p className="text-sm text-brand-ink">{after}</p>
    </div>
  );
}

/** Paste-ready before/after rewrites with copy buttons (Build Pack §7). */
export function RewritesView({ rewrites }: { rewrites: Rewrites }) {
  return (
    <div className="flex flex-col gap-3">
      <Block label="Title" before={rewrites.title.before} after={rewrites.title.after} />
      <Block
        label="Description — opening"
        before={rewrites.description_opening.before}
        after={rewrites.description_opening.after}
      />
    </div>
  );
}
