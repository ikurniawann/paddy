import type { Metadata } from "next";
import { Clock, Mail, MapPin, Store } from "lucide-react";
import { listPickupPoints } from "@/lib/store/catalog-server";
import { StaticPage } from "@/features/store/components/pages/static-page";
import { InstagramIcon, WhatsAppIcon } from "@/features/store/components/icons";
import { whatsappHref } from "@/features/store/lib/href";
import { loadStoreChrome, storeMetadata } from "@/features/store/lib/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return storeMetadata({
    title: "Contact Us",
    description: "Hubungi Paddy: alamat Paddy HQ Bandung, toko offline, WhatsApp, dan Instagram.",
    path: "/contact-us",
  });
}

export default async function ContactPage() {
  const [points, { settings }] = await Promise.all([listPickupPoints(), loadStoreChrome()]);
  const wa = whatsappHref(settings.whatsapp, "Halo Paddy, saya mau bertanya.");
  return (
    <StaticPage title="Contact Us" intro="Ada pertanyaan soal produk atau pesanan? Paddy siap membantu.">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-md border border-[var(--store-border)] p-6">
          <h2 className="flex items-center gap-2 text-[18px] font-semibold text-[#111]">
            <MapPin className="h-5 w-5 text-[var(--store-pink)]" aria-hidden /> Paddy HQ
          </h2>
          <address className="mt-3 text-[15px] leading-relaxed text-[#555] not-italic">
            Jl. Kopo Permai III F2 No. 15
            <br />
            Kec. Cangkuang Kulon, Kab. Bandung
            <br />
            Jawa Barat 40227
          </address>
          <p className="mt-3 text-[13px] text-[#888]">Kantor & produksi — bukan toko pengambilan.</p>
        </div>
        <div className="rounded-md border border-[var(--store-border)] p-6">
          <h2 className="flex items-center gap-2 text-[18px] font-semibold text-[#111]">
            <Mail className="h-5 w-5 text-[var(--store-pink)]" aria-hidden /> Hubungi kami
          </h2>
          <div className="mt-4 flex flex-col gap-3">
            {wa ? (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 self-start rounded-md bg-[var(--store-wa)] px-5 py-2.5 text-[15px] font-semibold text-white hover:brightness-95"
              >
                <WhatsAppIcon className="h-5 w-5" /> Chat WhatsApp
              </a>
            ) : null}
            {settings.instagram ? (
              <a
                href={settings.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 self-start rounded-md bg-[var(--store-insta)] px-5 py-2.5 text-[15px] font-semibold text-white hover:brightness-110"
              >
                <InstagramIcon className="h-5 w-5" /> @paddy.id
              </a>
            ) : null}
            {!wa && !settings.instagram ? (
              <p className="text-[15px] text-[#555]">Kunjungi toko Paddy terdekat di bawah ini.</p>
            ) : null}
          </div>
        </div>
      </div>

      {points.length > 0 ? (
        <section className="mt-12" aria-labelledby="stores-title">
          <h2 id="stores-title" className="mb-6 text-center text-[26px] font-semibold text-[#111]">
            Toko Paddy
          </h2>
          <ul className="grid gap-5 md:grid-cols-2">
            {points.map((point) => (
              <li key={point.warehouseId} className="rounded-md bg-[var(--store-pink-tint)] p-5">
                <p className="flex items-center gap-2 text-[16px] font-semibold text-[#111]">
                  <Store className="h-5 w-5 text-[var(--store-pink)]" aria-hidden />
                  {point.name}
                </p>
                <p className="mt-2 text-[14px] text-[#555]">
                  {point.address}
                  {point.city && !point.address.toLowerCase().includes(point.city.toLowerCase()) ? `, ${point.city}` : ""}
                </p>
                {point.openingHours ? (
                  <p className="mt-1 flex items-center gap-1.5 text-[14px] text-[#555]">
                    <Clock className="h-4 w-4" aria-hidden /> {point.openingHours}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </StaticPage>
  );
}
