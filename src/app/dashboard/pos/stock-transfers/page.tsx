import { Suspense } from "react";
import { StockTransfersPage } from "@/features/pos/stock-transfers";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <StockTransfersPage />
    </Suspense>
  );
}
