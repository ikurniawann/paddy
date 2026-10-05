"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { StoreLink } from "@/features/store/components/store-context";

export type HeroSlide = { desktop: string; mobile: string; alt: string; href: string };

const AUTOPLAY_MS = 5000;

export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = slides.length;

  useEffect(() => {
    if (paused || count < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [paused, count]);

  const go = (next: number) => setIndex(((next % count) + count) % count);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Promo Paddy"
      className="group relative w-full overflow-hidden bg-[#f6f0e6]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={(event) => {
        touchX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const start = touchX.current;
        touchX.current = null;
        const end = event.changedTouches[0]?.clientX;
        if (start == null || end == null) return;
        if (Math.abs(end - start) > 40) go(index + (end < start ? 1 : -1));
      }}
    >
      <div
        className="flex transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((slide, i) => (
          <StoreLink
            key={slide.desktop}
            href={slide.href}
            className="block w-full shrink-0"
            aria-roledescription="slide"
            aria-label={`${i + 1} dari ${count}: ${slide.alt}`}
            aria-hidden={i !== index}
            tabIndex={i === index ? 0 : -1}
          >
            <picture>
              <source media="(max-width: 767px)" srcSet={slide.mobile} />
              <img
                src={slide.desktop}
                alt={slide.alt}
                width={1920}
                height={1080}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "auto"}
                className="aspect-square h-auto w-full object-cover md:aspect-[16/9]"
              />
            </picture>
          </StoreLink>
        ))}
      </div>

      {count > 1 ? (
        <>
          <button
            type="button"
            aria-label="Slide sebelumnya"
            onClick={() => go(index - 1)}
            className="absolute top-1/2 left-3 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/70 text-[var(--store-text)] opacity-0 transition group-hover:opacity-100 focus:opacity-100 md:flex"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            aria-label="Slide berikutnya"
            onClick={() => go(index + 1)}
            className="absolute top-1/2 right-3 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/70 text-[var(--store-text)] opacity-0 transition group-hover:opacity-100 focus:opacity-100 md:flex"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2 md:bottom-5">
            {slides.map((slide, i) => (
              <button
                key={slide.desktop}
                type="button"
                aria-label={`Tampilkan slide ${i + 1}`}
                aria-current={i === index}
                onClick={() => go(i)}
                className="flex h-5 items-center"
              >
                <span
                  className={`block h-[4px] rounded-full transition-all ${i === index ? "w-12 bg-white" : "w-10 bg-white/50"}`}
                />
              </button>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
