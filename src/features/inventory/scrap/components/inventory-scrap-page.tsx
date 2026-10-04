import { ComingSoonPage } from "@/components/dashboard/coming-soon-page";

export function InventoryScrapPage() {
  return (
    <ComingSoonPage
      title="Scrap Item"
      description="Halaman ini akan mencatat waste, spoiled item, sample RnD, dan alasan pengurangan stok non-penjualan."
      backHref="/dashboard/inventory"
      backLabel="Kembali ke Inventory"
    />
  );
}
