import { PinkButton } from "@/features/store/components/home/section-title";
import { StoreLink } from "@/features/store/components/store-context";

export default function StoreNotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <p className="text-[96px] leading-none font-bold text-[var(--store-pink)]">404</p>
      <h1 className="mt-4 text-[28px] font-semibold text-[#111]">Ups, halaman tidak ditemukan</h1>
      <p className="mt-3 text-[16px] text-[#555]">
        Halaman yang kamu cari mungkin sudah dipindahkan atau produknya sudah tidak tersedia.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <PinkButton href="/shop">Lihat semua produk</PinkButton>
      </div>
      <StoreLink href="/" className="mt-5 text-[15px] font-semibold text-[var(--store-pink)] hover:underline">
        Kembali ke beranda
      </StoreLink>
    </div>
  );
}
