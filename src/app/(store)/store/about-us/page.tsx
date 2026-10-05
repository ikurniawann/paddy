import type { Metadata } from "next";
import { StaticPage } from "@/features/store/components/pages/static-page";
import { PinkButton } from "@/features/store/components/home/section-title";
import { storeMetadata } from "@/features/store/lib/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return storeMetadata({
    title: "About Us",
    description: "Paddy adalah brand lokal dari Bandung sejak 2017 — custom phone case dengan UV printing teknologi Jepang, tas, smartwatch, aksesoris, dan apparel.",
    path: "/about-us",
  });
}

const HIGHLIGHTS = [
  { title: "Sejak 2017", text: "Lahir di Bandung dan tumbuh bersama Paddy Besties di seluruh Indonesia." },
  { title: "UV Printing Jepang", text: "Desain dicetak dengan teknologi UV terkini dari Jepang: tajam, awet, dan tidak mudah pudar." },
  { title: "Lebih dari case", text: "Kini juga tas & backpack, Paddy Watch, aksesoris, apparel, dan adorable goods lainnya." },
];

export default function AboutPage() {
  return (
    <StaticPage title="About Us" intro="Customized Phone Cases & Adorable Goods — your adorable companion.">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/store/banners/welcome.webp" alt="Paddy — your adorable companion" width={1024} height={660} loading="lazy" className="h-auto w-full" />
        <div className="store-prose text-[16px] text-[#333]">
          <p>
            <strong>Paddy</strong> adalah brand lokal asal Bandung yang berdiri sejak 2017. Berawal dari custom phone case, kami
            ingin setiap orang bisa membawa karakter dan cerita mereka sendiri lewat barang yang dipakai setiap hari.
          </p>
          <p>
            Setiap case Paddy dicetak menggunakan <strong>teknik UV printing dengan teknologi dari Jepang</strong>, sehingga
            gambar terlihat tajam, tahan gores, dan tidak mudah menguning. Pilih desain dari katalog kami — mulai dari animal,
            floral, foodie, sampai kolaborasi dengan ilustrator lokal — lalu sesuaikan dengan tipe HP kamu.
          </p>
          <p>
            Sekarang Paddy juga menghadirkan tas & backpack, smartwatch Paddy Watch, aksesoris, apparel, dan berbagai
            adorable goods untuk menemani hari-harimu.
          </p>
        </div>
      </div>
      <ul className="mt-14 grid gap-6 md:grid-cols-3">
        {HIGHLIGHTS.map((item) => (
          <li key={item.title} className="rounded-md bg-[var(--store-pink-tint)] p-6 text-center">
            <p className="text-[20px] font-semibold text-[var(--store-pink)]">{item.title}</p>
            <p className="mt-2 text-[15px] text-[#444]">{item.text}</p>
          </li>
        ))}
      </ul>
      <div className="mt-12 rounded-md border border-[var(--store-border)] p-6 text-center">
        <p className="text-[18px] font-semibold text-[#111]">Paddy HQ</p>
        <p className="mt-1 text-[15px] text-[#555]">Jl. Kopo Permai III F2 No. 15, Kec. Cangkuang Kulon, Kab. Bandung, Jawa Barat 40227</p>
        <div className="mt-6">
          <PinkButton href="/shop">Belanja sekarang</PinkButton>
        </div>
      </div>
    </StaticPage>
  );
}
