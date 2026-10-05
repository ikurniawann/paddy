"use client";

import { Heart } from "lucide-react";
import { discountPercent } from "@/lib/store/types";
import { ProductCard } from "@/features/store/components/product-card";
import { StoreLink } from "@/features/store/components/store-context";
import { useHydrated, useWishlist } from "@/features/store/components/use-cart";

export function WishlistView() {
  const hydrated = useHydrated();
  const wishlist = useWishlist();

  if (!hydrated) {
    return <p className="py-20 text-center text-[var(--store-muted)]">Memuat wishlist…</p>;
  }

  if (wishlist.items.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <Heart className="h-14 w-14 text-[var(--store-pink-soft)]" strokeWidth={1.4} aria-hidden />
        <p className="mt-4 text-[20px] font-semibold text-[#111]">Wishlist kamu masih kosong</p>
        <p className="mt-2 max-w-md text-[15px] text-[#555]">Tekan ikon hati di produk favoritmu supaya mudah ditemukan lagi.</p>
        <StoreLink
          href="/shop"
          className="mt-6 rounded-md bg-[var(--store-pink)] px-8 py-3 text-[15px] font-semibold text-white uppercase hover:bg-[var(--store-pink-dark)]"
        >
          Jelajahi produk
        </StoreLink>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-6 text-center text-[14px] text-[#666]">
        {wishlist.items.length} produk disimpan di perangkat ini. Harga dapat berubah — cek detail produk untuk harga & stok terbaru.
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-8">
        {wishlist.items.map((item) => (
          <ProductCard
            key={item.id}
            product={{
              id: item.id,
              slug: item.slug,
              name: item.name,
              imageUrl: item.imageUrl,
              price: item.price,
              compareAtPrice: item.compareAtPrice,
              discountPercent: discountPercent(item.price, item.compareAtPrice),
              categoryName: item.categoryName,
              categorySlug: null,
              inStock: true,
              hasVariants: false,
            }}
          />
        ))}
      </div>
    </div>
  );
}
