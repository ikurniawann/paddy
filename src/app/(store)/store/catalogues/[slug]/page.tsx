import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStoreCollection, listStoreProducts } from "@/lib/store/catalog-server";
import { ListingView } from "@/features/store/components/listing/listing-view";
import { parseListingParams, type RawSearchParams } from "@/features/store/lib/href";
import { loadStoreChrome, storeMetadata } from "@/features/store/lib/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<RawSearchParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getStoreCollection(slug);
  if (!collection) return storeMetadata({ title: "Katalog tidak ditemukan", path: `/catalogues/${slug}`, noIndex: true });
  return storeMetadata({
    title: collection.name,
    description: collection.description || `Katalog desain ${collection.name} dari Paddy — custom phone case & adorable goods.`,
    path: `/catalogues/${collection.slug}`,
    image: collection.banner_url,
  });
}

export default async function CataloguePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = parseListingParams(await searchParams);
  const collection = await getStoreCollection(slug);
  if (!collection) notFound();
  const [result, { nav }] = await Promise.all([
    listStoreProducts({
      collectionSlug: collection.slug,
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
      path={`/catalogues/${collection.slug}`}
      title={collection.name}
      crumbs={collection.slug === "best-seller" ? [{ label: collection.name }] : [{ label: "Catalogues" }, { label: collection.name }]}
      description={collection.description}
      bannerUrl={collection.banner_url}
      result={result}
      state={query}
      categories={nav.categories}
    />
  );
}
