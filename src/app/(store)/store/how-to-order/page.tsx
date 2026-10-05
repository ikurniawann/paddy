import type { Metadata } from "next";
import { StaticPage } from "@/features/store/components/pages/static-page";
import { PinkButton } from "@/features/store/components/home/section-title";
import { StoreLink } from "@/features/store/components/store-context";
import { storeMetadata } from "@/features/store/lib/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return storeMetadata({
    title: "How to Order",
    description: "Cara belanja di Paddy Official Store: pilih produk, pilih varian, checkout, kirim atau ambil di toko, lalu bayar.",
    path: "/how-to-order",
  });
}

const STEPS = [
  { title: "Pilih produk", text: "Jelajahi menu Products atau Catalogues, lalu buka produk yang kamu suka." },
  { title: "Pilih varian / merk HP", text: "Tentukan pilihan seperti Merk HP atau Warna. Stok untuk dikirim dan stok di tiap toko langsung terlihat." },
  { title: "Masukkan ke keranjang", text: "Atur jumlah, tekan “Tambah ke Keranjang”, lalu buka keranjang untuk mengecek pesanan." },
  { title: "Checkout", text: "Isi nama dan nomor WhatsApp aktif — informasi pesanan akan dikirim ke sana." },
  { title: "Kirim atau ambil di toko", text: "Pilih kirim ke alamat dengan ongkir flat sesuai provinsi, atau ambil gratis di toko Paddy terdekat." },
  {
    title: "Bayar",
    text: "Bayar online (QRIS, VA, e-wallet, kartu) bila tersedia, atau transfer bank lalu unggah bukti transfer di halaman pesanan (batas 24 jam).",
  },
  { title: "Pesanan diproses", text: "Setelah pembayaran terverifikasi, pesanan dikemas lalu dikirim atau siap diambil. Pantau statusnya kapan saja." },
];

export default function HowToOrderPage() {
  return (
    <StaticPage title="How to Order" intro="Belanja di Paddy Official Store cuma butuh beberapa langkah.">
      <ol className="mx-auto max-w-3xl space-y-5">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-5 rounded-md border border-[var(--store-border)] p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--store-pink)] text-[18px] font-bold text-white">
              {index + 1}
            </span>
            <div>
              <h2 className="text-[18px] font-semibold text-[#111]">{step.title}</h2>
              <p className="mt-1 text-[15px] leading-relaxed text-[#555]">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mx-auto mt-10 max-w-3xl text-center text-[15px] text-[#555]">
        Kehilangan tautan pesanan? Buka{" "}
        <StoreLink href="/track-order" className="font-semibold text-[var(--store-pink)] underline">
          Cek Pesanan
        </StoreLink>{" "}
        dan masukkan nomor order serta nomor WhatsApp kamu.
      </p>
      <div className="mt-8 text-center">
        <PinkButton href="/shop">Mulai belanja</PinkButton>
      </div>
    </StaticPage>
  );
}
