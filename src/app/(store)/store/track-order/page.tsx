import type { Metadata } from "next";
import { TrackOrderForm } from "@/features/store/components/order/track-order-form";
import { Breadcrumb } from "@/features/store/components/listing/breadcrumb";
import { storeMetadata } from "@/features/store/lib/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return storeMetadata({
    title: "Cek Pesanan",
    description: "Cek status pesanan Paddy kamu dengan nomor order dan nomor WhatsApp.",
    path: "/track-order",
  });
}

export default function TrackOrderPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 pt-6 pb-20 lg:px-7">
      <Breadcrumb crumbs={[{ label: "Cek Pesanan" }]} />
      <div className="mx-auto mt-10 max-w-[480px]">
        <h1 className="text-center text-[30px] font-semibold text-[#111]">Cek Pesanan</h1>
        <p className="mt-2 text-center text-[15px] text-[#555]">
          Masukkan nomor order dan nomor WhatsApp yang kamu pakai saat checkout.
        </p>
        <div className="mt-8">
          <TrackOrderForm />
        </div>
      </div>
    </div>
  );
}
