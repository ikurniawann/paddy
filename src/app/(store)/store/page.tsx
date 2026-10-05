import type { Metadata } from "next";
import { getStoreHome } from "@/lib/store/catalog-server";
import { HeroSlider, type HeroSlide } from "@/features/store/components/home/hero-slider";
import { FeaturedTabs } from "@/features/store/components/home/featured-tabs";
import { SectionTitle, ViewMoreButton } from "@/features/store/components/home/section-title";
import { ValueStrip } from "@/features/store/components/home/value-strip";
import { ProductGrid } from "@/features/store/components/product-card";
import { StoreLink } from "@/features/store/components/store-context";
import { InstagramIcon } from "@/features/store/components/icons";
import { loadStoreChrome, storeMetadata } from "@/features/store/lib/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return storeMetadata({ path: "/" });
}

const HERO_SLIDES: HeroSlide[] = [
  { desktop: "/store/banners/hero-bags.webp", mobile: "/store/banners/hero-bags-m.webp", alt: "Grab it, love it! Say yes to Paddy Bags", href: "/product-category/paddy-bags" },
  { desktop: "/store/banners/hero-cases.webp", mobile: "/store/banners/hero-cases-m.webp", alt: "Paddy Cases — custom phone case", href: "/product-category/paddy-cases" },
  { desktop: "/store/banners/hero-watch.webp", mobile: "/store/banners/hero-watch-m.webp", alt: "Paddy Watch", href: "/product-category/paddy-watch" },
  { desktop: "/store/banners/hero-backpack.webp", mobile: "/store/banners/hero-backpack-m.webp", alt: "Paddy Backpack", href: "/product-category/paddy-bags" },
  { desktop: "/store/banners/hero-collab.webp", mobile: "/store/banners/hero-collab-m.webp", alt: "Koleksi kolaborasi Paddy", href: "/catalogues/collaboration" },
];

export default async function StoreHomePage() {
  const [home, { settings }] = await Promise.all([getStoreHome(), loadStoreChrome()]);
  return (
    <>
      <h1 className="sr-only">Paddy Official Store — Customized Phone Cases &amp; Adorable Goods</h1>
      <HeroSlider slides={HERO_SLIDES} />
      <ValueStrip />

      {/* Intro: wordmark + banner selamat datang */}
      <section className="mx-auto grid max-w-[1440px] items-center gap-8 px-4 py-10 md:grid-cols-2 lg:py-[70px]">
        <div className="hidden flex-col items-center text-center md:flex">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/store/icons/paddy-wordmark-black.png"
            alt="Paddy"
            width={358}
            height={141}
            loading="lazy"
            className="h-auto w-[60%] max-w-[400px]"
          />
          <p className="mt-10 text-[30px] leading-tight font-medium text-[#111]">
            Customized Phone Cases &amp;
            <br />
            Adorable Goods
          </p>
        </div>
        <StoreLink href="/shop" className="block overflow-hidden" aria-label="Welcome to our official website — belanja sekarang">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/store/banners/welcome.webp"
            alt="Paddy, your adorable companion — Welcome to our official website"
            width={1024}
            height={660}
            loading="lazy"
            className="h-auto w-full"
          />
        </StoreLink>
      </section>

      {home.featuredTabs.length > 0 ? (
        <section className="mx-auto max-w-[1300px] px-4 py-8 lg:py-10" aria-labelledby="featured-title">
          <SectionTitleWithId id="featured-title" title="Featured Product" subtitle="This is our latest, check this out!" />
          <FeaturedTabs tabs={home.featuredTabs} />
        </section>
      ) : null}

      {home.newArrivals.length > 0 ? (
        <section className="mx-auto max-w-[1300px] px-4 py-10 lg:py-14">
          <SectionTitle title="New Arrivals" />
          <ProductGrid products={home.newArrivals.slice(0, 8)} columns={4} />
          <ViewMoreButton href="/shop" />
        </section>
      ) : null}

      {home.bestSellers.length > 0 ? (
        <section className="mx-auto max-w-[1300px] px-4 py-10 lg:py-14">
          <SectionTitle title="Best Seller" subtitle="Favorit Paddy Besties!" />
          <ProductGrid products={home.bestSellers.slice(0, 5)} columns={5} />
          <ViewMoreButton href="/catalogues/best-seller" />
        </section>
      ) : null}

      {home.categoryTiles.length > 0 ? (
        <section className="mx-auto max-w-[1300px] px-4 py-10 lg:py-14">
          <SectionTitle title="Shop Our Products" subtitle="Now available with more product categories!" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-[30px] lg:gap-y-[50px]">
            {home.categoryTiles.map((tile) => (
              <StoreLink
                key={tile.slug}
                href={`/product-category/${tile.slug}`}
                className="block overflow-hidden transition hover:-translate-y-1 hover:shadow-lg"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={tile.bannerUrl}
                  alt={tile.name}
                  width={400}
                  height={300}
                  loading="lazy"
                  className="h-auto w-full"
                />
              </StoreLink>
            ))}
          </div>
        </section>
      ) : null}

      <section className="px-4 pt-12 pb-14 text-center lg:pt-16 lg:pb-[60px]">
        <SectionTitle title="Let's be besties!" subtitle="Follow us @paddy.id" />
        {settings.instagram ? (
          <a
            href={settings.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-[3px] bg-[var(--store-insta)] px-4 py-2.5 text-[14px] text-white transition hover:brightness-110 lg:mt-10"
          >
            <InstagramIcon className="h-4 w-4" />
            Follow on Instagram
          </a>
        ) : null}
      </section>
    </>
  );
}

function SectionTitleWithId({ id, title, subtitle }: { id: string; title: string; subtitle: string }) {
  return (
    <div id={id}>
      <SectionTitle title={title} subtitle={subtitle} />
    </div>
  );
}
