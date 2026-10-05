import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStoreCategory, listStoreProducts } from "@/lib/store/catalog-server";
import { ListingView } from "@/features/store/components/listing/listing-view";
import { parseListingParams, type RawSearchParams } from "@/features/store/lib/href";
import { loadStoreChrome, storeMetadata } from "@/features/store/lib/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<RawSearchParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await getStoreCategory(slug);
  if (!category) return storeMetadata({ title: "Kategori tidak ditemukan", path: `/product-category/${slug}`, noIndex: true });
  return storeMetadata({
    title: category.name,
    description: category.description || `Belanja ${category.name} di Paddy Official Store — brand lokal dari Bandung.`,
    path: `/product-category/${category.slug}`,
    image: category.banner_url,
  });
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = parseListingParams(await searchParams);
  const category = await getStoreCategory(slug);
  if (!category) notFound();
  const [result, { nav }] = await Promise.all([
    listStoreProducts({
      categorySlug: category.slug,
      q: query.q,
      sort: query.sort,
      minPrice: query.min,
      maxPrice: query.max,
      page: query.page,
      perPage: 12,
    }),
    loadStoreChrome(),
  ]);
  return (
    <ListingView
      path={`/product-category/${category.slug}`}
      title={category.name}
      crumbs={[{ label: "Products", href: "/shop" }, { label: category.name }]}
      description={category.description}
      bannerUrl={category.banner_url}
      result={result}
      state={query}
      categories={nav.categories}
      activeCategory={category.slug}
    />
  );
}
