import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRelatedProducts, getStoreProduct, listPickupPoints } from "@/lib/store/catalog-server";
import { formatRupiah } from "@/lib/store/types";
import { ProductGallery } from "@/features/store/components/product/product-gallery";
import { ProductPurchase } from "@/features/store/components/product/product-purchase";
import { DescriptionAccordion } from "@/features/store/components/product/description-accordion";
import { ProductGrid } from "@/features/store/components/product-card";
import { PaymentLogos } from "@/features/store/components/layout/whatsapp-float";
import { buildDescription } from "@/features/store/lib/variants";
import { getRequestOrigin, getStoreBase, storeMetadata } from "@/features/store/lib/server";
import { storeHref } from "@/features/store/lib/href";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getStoreProduct(slug);
  if (!product) return storeMetadata({ title: "Produk tidak ditemukan", path: `/product/${slug}`, noIndex: true });
  return storeMetadata({
    title: product.name,
    description: product.description || `${product.name} — ${formatRupiah(product.price)} di Paddy Official Store.`,
    path: `/product/${product.slug}`,
    image: product.imageUrl,
  });
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getStoreProduct(slug);
  if (!product) notFound();
  const [related, pickupPoints, base, origin] = await Promise.all([
    getRelatedProducts(product, 5),
    listPickupPoints(),
    getStoreBase(),
    getRequestOrigin(),
  ]);
  const paragraphs = buildDescription(product);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images.map((src) => (src.startsWith("http") ? src : `${origin}${src}`)),
    description: paragraphs.join(" "),
    category: product.categoryName ?? undefined,
    brand: { "@type": "Brand", name: "Paddy" },
    offers: {
      "@type": "Offer",
      priceCurrency: "IDR",
      price: product.price,
      availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${origin}${storeHref(base, `/product/${product.slug}`)}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // JSON-LD dari data katalog sendiri; "<" di-escape agar tidak bisa menutup tag script.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <div className="mx-auto max-w-[1300px] px-[10px] pt-6 lg:px-[58px] lg:pt-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_460px] lg:gap-16 xl:grid-cols-[1fr_520px]">
          <ProductGallery product={product} />
          <div className="lg:pt-2">
            <ProductPurchase product={product} pickupPoints={pickupPoints} />
          </div>
        </div>

        <div className="mt-12 lg:mt-6">
          <DescriptionAccordion paragraphs={paragraphs} />
        </div>

        {related.length > 0 ? (
          <section className="mt-6 border-t border-[var(--store-border)] pt-6 pb-12" aria-labelledby="related-title">
            <h2 id="related-title" className="mb-10 text-center text-[18px] font-semibold tracking-[0.04em] text-[#111] uppercase">
              Produk terkait
            </h2>
            <ProductGrid products={related} columns={5} />
          </section>
        ) : null}
      </div>
      <PaymentLogos />
    </>
  );
}
