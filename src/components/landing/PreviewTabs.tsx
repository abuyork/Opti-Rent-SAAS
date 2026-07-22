"use client";

import { useState, type ReactNode } from "react";

/**
 * Market switcher for the universal landing page's sample report: pill tabs
 * (design-ref "Language Tab Pill" — active bg-ink/text-paper, inactive fog)
 * above the preview card. Content is server-rendered per market and toggled
 * client-side, so the sample always matches the visitor's chosen market.
 */
export function PreviewTabs({
  tabs,
}: {
  tabs: { key: string; label: string; content: ReactNode }[];
}) {
  const [active, setActive] = useState(tabs[0]?.key);

  return (
    <div>
      <div className="mb-5 flex justify-center gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(t.key)}
            aria-pressed={t.key === active}
            className={`rounded-full px-4 py-1.5 font-mono text-xs transition-colors ${
              t.key === active ? "bg-ink text-paper" : "text-fog hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.key} hidden={t.key !== active}>
          {t.content}
        </div>
      ))}
    </div>
  );
}
