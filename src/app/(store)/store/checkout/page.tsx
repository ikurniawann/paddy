import type { Metadata } from "next";
import { listFlatZones, listPickupPoints } from "@/lib/store/catalog-server";
import { CheckoutForm } from "@/features/store/components/checkout/checkout-form";
import { Breadcrumb } from "@/features/store/components/listing/breadcrumb";
import { loadStoreChrome, storeMetadata } from "@/features/store/lib/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return storeMetadata({ title: "Checkout", path: "/checkout", noIndex: true });
}

export default async function CheckoutPage() {
  const [zones, pickupPoints, { settings }] = await Promise.all([listFlatZones(), listPickupPoints(), loadStoreChrome()]);
  return (
    <div className="mx-auto max-w-[1300px] px-4 pt-6 pb-16 lg:px-7">
      <Breadcrumb crumbs={[{ label: "Keranjang", href: "/cart" }, { label: "Checkout" }]} />
      <h1 className="mt-6 mb-8 text-center text-[28px] font-semibold text-[#111] lg:text-left lg:text-[34px]">Checkout</h1>
      <CheckoutForm zones={zones} pickupPoints={pickupPoints} onlinePayment={settings.onlinePayment} />
    </div>
  );
}
