"use client";

import { useState } from "react";
import { ChevronUp } from "lucide-react";

/** Akordeon "Deskripsi" berlatar pink muda (seperti paddy.id). */
export function DescriptionAccordion({ paragraphs, headline }: { paragraphs: string[]; headline?: string | null }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="border-t-2 border-[var(--store-pink)]">
      <h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="store-description"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between bg-[var(--store-pink-soft)] px-6 py-3.5 text-left text-[17px] font-medium text-[var(--store-pink)] lg:px-7 lg:py-2.5 lg:text-[16px]"
        >
          Deskripsi
          <ChevronUp className={`h-6 w-6 transition-transform ${open ? "" : "rotate-180"}`} aria-hidden />
        </button>
      </h2>
      {open ? (
        <div id="store-description" className="store-prose px-6 py-6 text-[16px] text-[#111] lg:px-7 lg:text-[15px]">
          {headline ? <p className="font-semibold uppercase">{headline}</p> : null}
          {paragraphs.map((text, index) => (
            <p key={index}>{text}</p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
