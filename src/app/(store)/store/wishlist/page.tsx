import type { Metadata } from "next";
import { WishlistView } from "@/features/store/components/pages/wishlist-view";
import { Breadcrumb } from "@/features/store/components/listing/breadcrumb";
import { storeMetadata } from "@/features/store/lib/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return storeMetadata({ title: "Wishlist", path: "/wishlist", noIndex: true });
}

export default function WishlistPage() {
  return (
    <div className="mx-auto max-w-[1300px] px-4 pt-6 pb-16 lg:px-7">
      <Breadcrumb crumbs={[{ label: "Wishlist" }]} />
      <h1 className="mt-6 mb-8 text-center text-[28px] font-semibold text-[#111] lg:text-[34px]">Wishlist</h1>
      <WishlistView />
    </div>
  );
}
