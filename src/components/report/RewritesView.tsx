"use client";

import { useState } from "react";
import type { Rewrites, TitleVariant } from "@/lib/types";

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

/** Three paste-ready title options in different tones, each with its own copy button. */
function TitleVariantsBlock({
  before,
  variants,
}: {
  before: string;
  variants: TitleVariant[];
}) {
  return (
    <div className="rounded-lg border border-brand-line p-4 text-left">
      <h4 className="font-semibold text-brand-navy">Title — 3 options</h4>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-brand-muted">Before</p>
      <p className="text-sm text-brand-muted line-through">{before}</p>
      <div className="mt-3 flex flex-col gap-2">
        {variants.map((v) => (
          <div
            key={v.tone + v.text}
            className="flex items-center justify-between gap-3 rounded-md bg-brand-card px-3 py-2"
          >
            <div className="min-w-0">
              <span className="text-xs font-medium uppercase tracking-wide text-brand-teal">
                {v.tone}
              </span>
              <p className="text-sm text-brand-ink">{v.text}</p>
            </div>
            <CopyButton text={v.text} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Paste-ready before/after rewrites with copy buttons (Build Pack §7). */
export function RewritesView({ rewrites }: { rewrites: Rewrites }) {
  const variants = rewrites.title_variants;
  return (
    <div className="flex flex-col gap-3">
      {variants && variants.length > 0 ? (
        <TitleVariantsBlock before={rewrites.title.before} variants={variants} />
      ) : (
        // Audits scored before title variants existed have only the single rewrite.
        <Block label="Title" before={rewrites.title.before} after={rewrites.title.after} />
      )}
      <Block
        label="Description — opening"
        before={rewrites.description_opening.before}
        after={rewrites.description_opening.after}
      />
    </div>
  );
}
