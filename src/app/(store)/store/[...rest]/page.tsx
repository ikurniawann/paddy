import { notFound } from "next/navigation";

// Path toko yang tidak dikenal → not-found bergaya toko (bukan 404 ERP).
export default function StoreCatchAll() {
  notFound();
}
