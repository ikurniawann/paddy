import { Suspense } from "react";
import { StockTransfersPage } from "@/features/pos/stock-transfers";

// Items → Produk → Persediaan → Transfer Stok (antar toko & gudang, EPIC-052).
export default function Page() {
  return (
    <Suspense fallback={null}>
      <StockTransfersPage />
    </Suspense>
  );
}
