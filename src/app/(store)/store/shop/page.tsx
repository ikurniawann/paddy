import type { Metadata } from "next";
import { listStoreProducts } from "@/lib/store/catalog-server";
import { ListingView } from "@/features/store/components/listing/listing-view";
import { parseListingParams, type RawSearchParams } from "@/features/store/lib/href";
import { loadStoreChrome, storeMetadata } from "@/features/store/lib/server";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<RawSearchParams> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = parseListingParams(await searchParams);
  return storeMetadata({
    title: q ? `Cari "${q}"` : "Shop",
    description: "Belanja semua produk Paddy: custom phone case, tas, Paddy Watch, aksesoris, dan apparel.",
    path: "/shop",
    noIndex: Boolean(q),
  });
}

export default async function ShopPage({ searchParams }: Props) {
  const params = parseListingParams(await searchParams);
  const [result, { nav }] = await Promise.all([
    listStoreProducts({
      q: params.q,
      sort: params.sort,
      minPrice: params.min,
      maxPrice: params.max,
      page: params.page,
      perPage: 12,
    }),
    loadStoreChrome(),
  ]);
  return (
    <ListingView
      path="/shop"
      title={params.q ? `Hasil pencarian "${params.q}"` : "Semua Produk"}
      crumbs={[{ label: "Shop" }]}
      result={result}
      state={params}
      categories={nav.categories}
    />
  );
}
