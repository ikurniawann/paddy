import type { Metadata } from "next";
import { CartView } from "@/features/store/components/cart/cart-view";
import { Breadcrumb } from "@/features/store/components/listing/breadcrumb";
import { PaymentLogos } from "@/features/store/components/layout/whatsapp-float";
import { storeMetadata } from "@/features/store/lib/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return storeMetadata({ title: "Keranjang", path: "/cart", noIndex: true });
}

export default function CartPage() {
  return (
    <>
      <div className="mx-auto max-w-[1300px] px-4 pt-6 pb-16 lg:px-7">
        <Breadcrumb crumbs={[{ label: "Keranjang" }]} />
        <h1 className="mt-6 mb-8 text-center text-[28px] font-semibold text-[#111] lg:text-left lg:text-[34px]">Keranjang Belanja</h1>
        <CartView />
      </div>
      <PaymentLogos />
    </>
  );
}
