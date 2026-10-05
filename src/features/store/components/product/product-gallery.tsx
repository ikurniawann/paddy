"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import type { StoreProductDetail } from "@/lib/store/types";
import { DiscountBadge, WishlistButton } from "@/features/store/components/product-card";

export function ProductGallery({ product }: { product: StoreProductDetail }) {
  const images = product.images.length > 0 ? product.images : product.imageUrl ? [product.imageUrl] : [];
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const current = images[active] ?? null;

  useEffect(() => {
    if (!zoom) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setZoom(false);
      if (event.key === "ArrowRight") setActive((i) => (i + 1) % images.length);
      if (event.key === "ArrowLeft") setActive((i) => (i - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [zoom, images.length]);

  return (
    <div>
      <div className="relative">
        <button
          type="button"
          onClick={() => current && setZoom(true)}
          className="block aspect-square w-full cursor-zoom-in overflow-hidden bg-white lg:aspect-[4/3]"
          aria-label="Perbesar gambar produk"
        >
          {current ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={current}
              alt={product.name}
              width={600}
              height={600}
              fetchPriority="high"
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="flex h-full items-center justify-center bg-[var(--store-pink-tint)] text-[var(--store-muted)]">Paddy</span>
          )}
        </button>
        {product.discountPercent ? (
          <span className="pointer-events-none absolute top-[4%] left-0 lg:top-[5%] lg:left-[2%]">
            <span className="lg:hidden">
              <DiscountBadge percent={product.discountPercent} size="sm" />
            </span>
            <span className="hidden lg:block">
              <DiscountBadge percent={product.discountPercent} size="lg" />
            </span>
          </span>
        ) : null}
        <WishlistButton product={product} className="absolute top-[4%] right-0 lg:hidden" />
        {current ? (
          <button
            type="button"
            onClick={() => setZoom(true)}
            aria-label="Buka galeri layar penuh"
            className="absolute bottom-[3%] left-[2%] hidden h-[52px] w-[52px] items-center justify-center rounded-full bg-[var(--store-pink)] text-white shadow hover:bg-[var(--store-pink-dark)] lg:flex"
          >
            <Maximize2 className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      {images.length > 1 ? (
        <ul className="mt-5 grid grid-cols-4 gap-3 lg:mt-4 lg:max-w-[460px]" aria-label="Gambar produk">
          {images.map((src, index) => (
            <li key={src}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Tampilkan gambar ${index + 1}`}
                aria-current={index === active}
                className={`block aspect-[5/6] w-full overflow-hidden border bg-white ${
                  index === active ? "border-[#999]" : "border-transparent opacity-80 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" width={120} height={144} loading="lazy" className="h-full w-full object-contain" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {zoom && current ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Galeri ${product.name}`}
          className="fixed inset-0 z-[85] flex items-center justify-center bg-black/85 p-4"
          onClick={() => setZoom(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current}
            alt={product.name}
            width={1000}
            height={1000}
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(event) => event.stopPropagation()}
          />
          <button
            type="button"
            autoFocus
            aria-label="Tutup galeri"
            className="absolute top-4 right-4 rounded-full bg-white/15 p-2 text-white hover:bg-white/25"
            onClick={() => setZoom(false)}
          >
            <X className="h-6 w-6" />
          </button>
          {images.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="Gambar sebelumnya"
                className="absolute left-4 rounded-full bg-white/15 p-2 text-white hover:bg-white/25"
                onClick={(event) => {
                  event.stopPropagation();
                  setActive((i) => (i - 1 + images.length) % images.length);
                }}
              >
                <ChevronLeft className="h-7 w-7" />
              </button>
              <button
                type="button"
                aria-label="Gambar berikutnya"
                className="absolute right-4 rounded-full bg-white/15 p-2 text-white hover:bg-white/25"
                onClick={(event) => {
                  event.stopPropagation();
                  setActive((i) => (i + 1) % images.length);
                }}
              >
                <ChevronRight className="h-7 w-7" />
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
