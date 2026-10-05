"use client";

import { useState } from "react";
import type { StoreProductCard } from "@/lib/store/types";
import { ProductGrid } from "@/features/store/components/product-card";
import { ViewMoreButton } from "@/features/store/components/home/section-title";

export type FeaturedTab = { slug: string; name: string; products: StoreProductCard[] };

export function FeaturedTabs({ tabs }: { tabs: FeaturedTab[] }) {
  const [active, setActive] = useState(tabs[0]?.slug ?? "");
  const current = tabs.find((tab) => tab.slug === active) ?? tabs[0];
  if (!current) return null;
  return (
    <div>
      <div role="tablist" aria-label="Kategori produk unggulan" className="mb-8 flex flex-wrap justify-center gap-x-1 gap-y-1 lg:mb-10">
        {tabs.map((tab) => {
          const selected = tab.slug === current.slug;
          return (
            <button
              key={tab.slug}
              type="button"
              role="tab"
              id={`featured-tab-${tab.slug}`}
              aria-selected={selected}
              aria-controls="featured-panel"
              onClick={() => setActive(tab.slug)}
              className={`w-1/3 px-2 py-2 text-[15px] font-medium transition sm:w-auto sm:px-4 lg:text-[16px] ${
                selected ? "text-[#111]" : "text-[#777] hover:text-[var(--store-pink)]"
              }`}
            >
              {tab.name}
            </button>
          );
        })}
      </div>
      <div id="featured-panel" role="tabpanel" aria-labelledby={`featured-tab-${current.slug}`}>
        <ProductGrid products={current.products} columns={5} />
      </div>
      <ViewMoreButton href={`/product-category/${current.slug}`} />
    </div>
  );
}
