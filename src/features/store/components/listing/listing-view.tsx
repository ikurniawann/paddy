import { ChevronLeft, ChevronRight } from "lucide-react";
import type { StoreListResult, StoreNavItem } from "@/lib/store/types";
import { ProductGrid } from "@/features/store/components/product-card";
import { StoreLink } from "@/features/store/components/store-context";
import { Breadcrumb, type Crumb } from "@/features/store/components/listing/breadcrumb";
import { FilterPanel, PriceFilter, SortSelect, type ListingState } from "@/features/store/components/listing/listing-controls";
import { listingQuery } from "@/features/store/lib/href";

type ListingViewProps = {
  /** Path toko halaman ini, mis. "/shop" atau "/product-category/paddy-cases". */
  path: string;
  title: string;
  crumbs: Crumb[];
  description?: string | null;
  bannerUrl?: string | null;
  result: StoreListResult;
  state: ListingState;
  categories: StoreNavItem[];
  activeCategory?: string | null;
};

function pageNumbers(current: number, total: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: Array<number | "…"> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) out.push("…");
  for (let i = start; i <= end; i += 1) out.push(i);
  if (end < total - 1) out.push("…");
  out.push(total);
  return out;
}

function Pagination({ path, state, page, pageCount }: { path: string; state: ListingState; page: number; pageCount: number }) {
  if (pageCount <= 1) return null;
  const link = (p: number) => `${path}${listingQuery({ ...state, page: p })}`;
  const cell = "flex h-10 min-w-10 items-center justify-center rounded-md border px-3 text-[15px] font-medium";
  return (
    <nav aria-label="Halaman produk" className="mt-14 flex flex-wrap items-center justify-center gap-2">
      {page > 1 ? (
        <StoreLink href={link(page - 1)} className={`${cell} border-[var(--store-border)] hover:border-[var(--store-pink)]`} aria-label="Halaman sebelumnya">
          <ChevronLeft className="h-4 w-4" />
        </StoreLink>
      ) : null}
      {pageNumbers(page, pageCount).map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="px-1 text-[var(--store-muted)]">
            …
          </span>
        ) : p === page ? (
          <span key={p} aria-current="page" className={`${cell} border-[var(--store-pink)] bg-[var(--store-pink)] text-white`}>
            {p}
          </span>
        ) : (
          <StoreLink key={p} href={link(p)} className={`${cell} border-[var(--store-border)] hover:border-[var(--store-pink)] hover:text-[var(--store-pink)]`}>
            {p}
          </StoreLink>
        )
      )}
      {page < pageCount ? (
        <StoreLink href={link(page + 1)} className={`${cell} border-[var(--store-border)] hover:border-[var(--store-pink)]`} aria-label="Halaman berikutnya">
          <ChevronRight className="h-4 w-4" />
        </StoreLink>
      ) : null}
    </nav>
  );
}

export function ListingView({
  path,
  title,
  crumbs,
  description,
  bannerUrl,
  result,
  state,
  categories,
  activeCategory,
}: ListingViewProps) {
  const from = result.total === 0 ? 0 : (result.page - 1) * result.perPage + 1;
  const to = Math.min(result.page * result.perPage, result.total);
  const summary =
    result.total === 0
      ? "Tidak ada hasil"
      : result.total <= result.perPage && result.page === 1
        ? `Menampilkan semua ${result.total} hasil`
        : `Menampilkan ${from}–${to} dari ${result.total} hasil`;
  const filtered = Boolean(state.q || state.min != null || state.max != null);

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-16 lg:px-7">
      <div className="flex flex-col items-center gap-4 pt-6 lg:flex-row lg:items-center lg:justify-between lg:pt-6">
        <Breadcrumb crumbs={crumbs} />
        <div className="hidden items-center gap-4 lg:flex">
          <p className="text-[15px] text-[#111]" aria-live="polite">
            {summary}
          </p>
          <SortSelect path={path} state={state} />
        </div>
      </div>

      <h1 className="sr-only">{title}</h1>

      <div className="mt-4 grid gap-8 lg:mt-10 lg:grid-cols-[300px_1fr] lg:gap-12">
        <aside aria-label="Filter produk" className="lg:pt-1">
          <FilterPanel>
            {bannerUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={bannerUrl} alt={title} width={400} height={300} loading="lazy" className="mb-6 hidden h-auto w-full lg:block" />
            ) : null}
            <h2 className="text-[20px] font-semibold text-[#111]">Saring berdasarkan harga</h2>
            <div className="mt-3">
              <PriceFilter key={`${state.min}-${state.max}-${path}`} path={path} state={state} range={result.priceRange} />
            </div>
            {categories.length > 0 ? (
              <div className="mt-8">
                <h2 className="text-[20px] font-semibold text-[#111]">Kategori</h2>
                <ul className="mt-3 space-y-1.5 text-[15px]">
                  <li>
                    <StoreLink
                      href="/shop"
                      className={`hover:text-[var(--store-pink)] ${path === "/shop" ? "font-semibold text-[var(--store-pink)]" : ""}`}
                    >
                      Semua Produk
                    </StoreLink>
                  </li>
                  {categories.map((category) => (
                    <li key={category.slug}>
                      <StoreLink
                        href={`/product-category/${category.slug}`}
                        className={`hover:text-[var(--store-pink)] ${activeCategory === category.slug ? "font-semibold text-[var(--store-pink)]" : ""}`}
                      >
                        {category.name}
                      </StoreLink>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </FilterPanel>
          <div className="mt-5 flex flex-col items-center gap-3 lg:hidden">
            <SortSelect path={path} state={state} />
            <p className="text-[14px] text-[#555]">{summary}</p>
          </div>
        </aside>

        <section aria-label="Daftar produk">
          {state.q || description ? (
            <div className="mb-6 text-center lg:text-left">
              {state.q ? (
                <p className="text-[18px] text-[#111]">
                  Hasil pencarian untuk <strong>&ldquo;{state.q}&rdquo;</strong>
                </p>
              ) : null}
              {description ? <p className="mt-1 text-[15px] text-[#555]">{description}</p> : null}
            </div>
          ) : null}
          {result.items.length > 0 ? (
            <ProductGrid products={result.items} columns={4} />
          ) : (
            <div className="flex flex-col items-center rounded-md border border-dashed border-[var(--store-border)] px-6 py-16 text-center">
              <p className="text-[20px] font-semibold text-[#111]">Produk tidak ditemukan</p>
              <p className="mt-2 max-w-md text-[15px] text-[#555]">
                {filtered
                  ? "Coba ubah kata kunci atau rentang harga, atau lihat semua produk Paddy."
                  : "Belum ada produk di halaman ini. Lihat koleksi Paddy lainnya, yuk!"}
              </p>
              <StoreLink
                href={filtered ? path : "/shop"}
                className="mt-6 rounded-md bg-[var(--store-pink)] px-6 py-2.5 text-[15px] font-semibold text-white uppercase hover:bg-[var(--store-pink-dark)]"
              >
                {filtered ? "Hapus filter" : "Lihat semua produk"}
              </StoreLink>
            </div>
          )}
          <Pagination path={path} state={state} page={result.page} pageCount={result.pageCount} />
        </section>
      </div>
    </div>
  );
}
