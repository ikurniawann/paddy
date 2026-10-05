import type { Metadata } from "next";
import { StaticPage } from "@/features/store/components/pages/static-page";
import { FaqAccordion, type FaqItem } from "@/features/store/components/pages/faq-accordion";
import { storeMetadata } from "@/features/store/lib/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return storeMetadata({
    title: "Frequently Asked Questions (FAQs)",
    description: "Pertanyaan yang sering diajukan seputar produk, pemesanan, pembayaran, dan pengiriman Paddy.",
    path: "/frequently-asked-questions-faqs",
  });
}

const FAQS: FaqItem[] = [
  {
    q: "Apa itu Paddy?",
    a: "Paddy adalah brand lokal dari Bandung sejak 2017 yang membuat custom phone case, tas, smartwatch Paddy Watch, aksesoris, apparel, dan adorable goods.",
  },
  {
    q: "Bagaimana case Paddy dicetak?",
    a: "Desain dicetak dengan teknik UV printing menggunakan teknologi dari Jepang, sehingga hasilnya tajam, tahan gores, dan tidak mudah menguning.",
  },
  {
    q: "Bagaimana cara memilih case untuk HP saya?",
    a: "Di halaman produk, pilih Merk HP (dan Warna bila ada) sesuai perangkatmu. Bila tipe HP-mu tidak ada di daftar, hubungi kami untuk menanyakan ketersediaan.",
  },
  {
    q: "Metode pembayaran apa saja yang tersedia?",
    a: "Bila pembayaran online aktif, kamu bisa membayar dengan QRIS, Virtual Account, e-wallet, atau kartu. Selain itu tersedia transfer bank manual: nomor rekening tampil setelah pesanan dibuat dan bukti transfer diunggah di halaman pesanan.",
  },
  {
    q: "Berapa lama batas waktu pembayaran?",
    a: "Untuk transfer bank, batas pembayaran 24 jam setelah pesanan dibuat. Pesanan yang belum dibayar akan dibatalkan otomatis dan stoknya dilepas kembali.",
  },
  {
    q: "Berapa ongkos kirimnya?",
    a: "Paddy memakai ongkir flat per wilayah provinsi. Besaran ongkir langsung terlihat di halaman checkout setelah kamu memilih provinsi tujuan.",
  },
  {
    q: "Bisakah saya mengambil pesanan di toko?",
    a: "Bisa. Pilih “Ambil di toko” saat checkout, lalu pilih toko Paddy yang stoknya tersedia. Tunjukkan nomor order saat mengambil pesanan — tanpa ongkir.",
  },
  {
    q: "Bagaimana cara mengecek status pesanan?",
    a: "Buka tautan pesanan yang muncul setelah checkout, atau gunakan menu Cek Pesanan dengan nomor order dan nomor WhatsApp yang kamu gunakan.",
  },
  {
    q: "Apakah ada garansi?",
    a: "Paddy memberikan garansi kepuasan. Bila produk yang diterima cacat produksi atau tidak sesuai pesanan, hubungi customer service kami dengan menyertakan nomor order dan foto produk.",
  },
];

export default function FaqPage() {
  return (
    <StaticPage title="Frequently Asked Questions (FAQs)" intro="Belum menemukan jawabanmu? Hubungi kami lewat halaman Contact Us.">
      <FaqAccordion items={FAQS} />
    </StaticPage>
  );
}
