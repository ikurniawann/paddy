"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

export type FaqItem = { q: string; a: string };

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();
  return (
    <div className="mx-auto max-w-3xl divide-y divide-[var(--store-border)] border-y border-[var(--store-border)]">
      {items.map((item, index) => {
        const expanded = open === index;
        const panelId = `${baseId}-panel-${index}`;
        const buttonId = `${baseId}-button-${index}`;
        return (
          <div key={item.q}>
            <h2>
              <button
                id={buttonId}
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpen(expanded ? null : index)}
                className={`flex w-full items-center justify-between gap-4 px-2 py-4 text-left text-[16px] font-semibold transition lg:text-[17px] ${
                  expanded ? "text-[var(--store-pink)]" : "text-[#111] hover:text-[var(--store-pink)]"
                }`}
              >
                {item.q}
                <ChevronDown className={`h-5 w-5 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden />
              </button>
            </h2>
            <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!expanded} className="px-2 pb-5 text-[15px] leading-relaxed text-[#555]">
              {item.a}
            </div>
          </div>
        );
      })}
    </div>
  );
}
