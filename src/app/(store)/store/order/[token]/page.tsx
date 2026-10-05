import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStoreOrder } from "@/lib/store/checkout-server";
import { OrderView } from "@/features/store/components/order/order-view";
import { Breadcrumb } from "@/features/store/components/listing/breadcrumb";
import { loadStoreChrome, storeMetadata } from "@/features/store/lib/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata(): Promise<Metadata> {
  // Halaman status pesanan bersifat privat (siapa pun yang punya tautan) — jangan diindeks.
  return storeMetadata({ title: "Status Pesanan", path: "/track-order", noIndex: true });
}

export default async function OrderPage({ params }: Props) {
  const { token } = await params;
  const [order, { settings }] = await Promise.all([getStoreOrder(token), loadStoreChrome()]);
  if (!order) notFound();
  return (
    <div className="mx-auto max-w-[1200px] px-4 pt-6 pb-16 lg:px-7">
      <Breadcrumb crumbs={[{ label: "Cek Pesanan", href: "/track-order" }, { label: order.orderNumber }]} />
      <div className="mt-6">
        <OrderView token={token} initial={order} bankAccounts={settings.bankAccounts} whatsapp={settings.whatsapp} />
      </div>
    </div>
  );
}
