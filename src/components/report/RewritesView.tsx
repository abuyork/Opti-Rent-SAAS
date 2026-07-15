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
      className="no-print rounded-full border border-dove px-3 py-1 font-mono text-[11px] font-medium text-ink hover:bg-cream"
    >
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}

function Block({ label, before, after }: { label: string; before: string; after: string }) {
  return (
    <div className="rounded-lg border border-dove p-5 text-left">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-ink">{label}</h4>
        <CopyButton text={after} />
      </div>
      <p className="mt-3 font-mono text-[11px] uppercase tracking-wide text-pewter">Before</p>
      <p className="text-sm text-fog line-through">{before}</p>
      <p className="mt-2 font-mono text-[11px] uppercase tracking-wide text-pewter">After</p>
      <p className="text-sm text-ink">{after}</p>
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
    <div className="rounded-lg border border-dove p-5 text-left">
      <h4 className="font-medium text-ink">Three title options</h4>
      <p className="mt-3 font-mono text-[11px] uppercase tracking-wide text-pewter">Before</p>
      <p className="text-sm text-fog line-through">{before}</p>
      <div className="mt-3 flex flex-col gap-2">
        {variants.map((v) => (
          <div
            key={v.tone + v.text}
            className="flex items-center justify-between gap-3 rounded-lg bg-cream px-4 py-2.5"
          >
            <div className="min-w-0">
              <span className="font-mono text-[11px] uppercase tracking-wide text-pewter">
                {v.tone}
              </span>
              <p className="text-sm text-ink">{v.text}</p>
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
        label="Description opening"
        before={rewrites.description_opening.before}
        after={rewrites.description_opening.after}
      />
    </div>
  );
}
