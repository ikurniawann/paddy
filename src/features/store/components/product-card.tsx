"use client";

import { Heart } from "lucide-react";
import { formatRupiah, type StoreProductCard } from "@/lib/store/types";
import { StoreLink, useStore } from "@/features/store/components/store-context";
import { useWishlist } from "@/features/store/components/use-cart";

export function DiscountBadge({ percent, size = "md" }: { percent: number; size?: "sm" | "md" | "lg" }) {
  const dims =
    size === "lg"
      ? "h-[52px] w-[52px] text-[17px]"
      : size === "sm"
        ? "h-[34px] w-[34px] text-[11px]"
        : "h-[34px] w-[34px] text-[11px] sm:h-[40px] sm:w-[40px] sm:text-[13px]";
  return (
    <span
      className={`flex items-center justify-center rounded-full bg-[var(--store-pink)] font-semibold text-white ${dims}`}
      aria-label={`Diskon ${percent}%`}
    >
      -{percent}%
    </span>
  );
}

export function WishlistButton({
  product,
  className = "",
}: {
  product: Pick<StoreProductCard, "id" | "slug" | "name" | "imageUrl" | "price" | "compareAtPrice" | "categoryName">;
  className?: string;
}) {
  const wishlist = useWishlist();
  const { toast } = useStore();
  const active = wishlist.has(product.id);
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? `Hapus ${product.name} dari wishlist` : `Tambah ${product.name} ke wishlist`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        wishlist.toggle({
          id: product.id,
          slug: product.slug,
          name: product.name,
          imageUrl: product.imageUrl,
          price: product.price,
          compareAtPrice: product.compareAtPrice,
          categoryName: product.categoryName,
        });
        toast(active ? "Dihapus dari wishlist" : "Ditambahkan ke wishlist", active ? undefined : { label: "Lihat", href: "/wishlist" });
      }}
      className={`flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[var(--store-pink)] text-white shadow-sm transition hover:bg-[var(--store-pink-dark)] sm:h-[38px] sm:w-[38px] ${className}`}
    >
      <Heart className="h-[18px] w-[18px]" fill={active ? "currentColor" : "none"} strokeWidth={2.2} />
    </button>
  );
}

export function PriceLine({
  price,
  compareAtPrice,
  stacked = true,
  large = false,
}: {
  price: number;
  compareAtPrice: number | null;
  stacked?: boolean;
  large?: boolean;
}) {
  return (
    <div className={stacked ? "flex flex-col items-center leading-tight" : "flex items-baseline gap-2.5"}>
      {compareAtPrice ? (
        <del className={`font-semibold text-[#8a8a8a] ${large ? "text-[19px]" : "text-[13px] sm:text-[14px]"}`}>
          <span className="sr-only">Harga normal </span>
          {formatRupiah(compareAtPrice)}
        </del>
      ) : null}
      <span className={`font-bold text-[#111] ${large ? "text-[20px] lg:text-[21px]" : "text-[14px] sm:text-[15px]"}`}>
        {compareAtPrice ? <span className="sr-only">Harga diskon </span> : null}
        {formatRupiah(price)}
      </span>
    </div>
  );
}

export function ProductCard({ product, priority = false }: { product: StoreProductCard; priority?: boolean }) {
  return (
    <article className="group relative flex flex-col text-center">
      <StoreLink
        href={`/product/${product.slug}`}
        className="relative block rounded-md transition duration-200 group-hover:-translate-y-1"
      >
        <div className="relative aspect-square overflow-hidden bg-white">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product.name}
              width={400}
              height={400}
              loading={priority ? "eager" : "lazy"}
              className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[var(--store-pink-tint)] text-sm text-[var(--store-muted)]">
              Paddy
            </div>
          )}
          {!product.inStock ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60">
              <span className="rounded-full bg-[#555]/85 px-3 py-1 text-xs font-semibold text-white">Stok habis</span>
            </div>
          ) : null}
        </div>
        {product.discountPercent ? (
          <span className="absolute top-[6%] left-[2%]">
            <DiscountBadge percent={product.discountPercent} />
          </span>
        ) : null}
        <div className="mt-3 px-1">
          {product.categoryName ? (
            <p className="text-[12px] tracking-[0.06em] text-[#222] sm:text-[13px]">{product.categoryName}</p>
          ) : null}
          <h3 className="mt-0.5 line-clamp-2 text-[14px] leading-snug font-semibold text-[#111] sm:text-[15px]">
            {product.name}
          </h3>
          <div className="mt-1">
            <PriceLine price={product.price} compareAtPrice={product.compareAtPrice} />
          </div>
        </div>
      </StoreLink>
      <WishlistButton
        product={product}
        className="absolute top-[6%] right-[2%] opacity-100 lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100"
      />
    </article>
  );
}

export function ProductGrid({
  products,
  columns = 4,
}: {
  products: StoreProductCard[];
  columns?: 4 | 5;
}) {
  return (
    <div
      className={`grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 ${columns === 5 ? "lg:grid-cols-5 lg:gap-x-6" : "lg:grid-cols-4 lg:gap-x-8"}`}
    >
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} priority={index < 4} />
      ))}
    </div>
  );
}
