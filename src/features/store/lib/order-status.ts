// Label & tahapan status pesanan website toko (shop.orders.status).

export type OrderTone = "amber" | "green" | "blue" | "gray" | "red";

export function orderStatusLabel(status: string, shippingMethod?: string): string {
  switch (status) {
    case "pending":
      return "Menunggu pembayaran";
    case "paid":
      return "Dibayar";
    case "packing":
      // Ambil di toko: admin "Tandai Disiapkan" = barang siap diambil.
      return shippingMethod === "pickup" ? "Siap diambil" : "Diproses";
    case "shipped":
      return "Dikirim";
    case "completed":
      return shippingMethod === "pickup" ? "Sudah diambil" : "Selesai";
    case "cancelled":
      return "Dibatalkan";
    case "refund":
      return "Dikembalikan";
    default:
      return status;
  }
}

export function orderStatusTone(status: string): OrderTone {
  if (status === "pending") return "amber";
  if (status === "completed" || status === "paid") return "green";
  if (status === "packing" || status === "shipped") return "blue";
  if (status === "cancelled" || status === "refund") return "red";
  return "gray";
}

const FLOW = ["pending", "paid", "packing", "shipped", "completed"] as const;

export function orderSteps(shippingMethod: string): Array<{ key: string; label: string }> {
  // Ambil di toko tidak melewati tahap "dikirim" (paid → packing → completed).
  const flow = shippingMethod === "pickup" ? FLOW.filter((key) => key !== "shipped") : FLOW;
  return flow.map((key) => ({
    key,
    label: key === "pending" ? "Pesanan dibuat" : orderStatusLabel(key, shippingMethod),
  }));
}

/** Indeks tahap aktif (−1 bila dibatalkan/refund). */
export function orderStepIndex(status: string, shippingMethod?: string): number {
  if (shippingMethod === "pickup" && status === "shipped") return -1;
  const index = FLOW.indexOf(status as (typeof FLOW)[number]);
  // Tahap "dikirim" tidak ada di alur ambil di toko → "completed" bergeser satu.
  return shippingMethod === "pickup" && status === "completed" ? index - 1 : index;
}

/** Sisa waktu (ms) → "23 jam 59 menit" / "59 menit 10 detik"; "" bila habis. */
export function formatCountdown(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h} jam ${m} menit`;
  return `${m} menit ${s} detik`;
}
