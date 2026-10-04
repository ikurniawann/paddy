export function formatCurrency(num: number): string {
  return `Rp ${new Intl.NumberFormat("id-ID").format(num)}`;
}

export function formatQuantity(value?: number | null): string {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 4,
  }).format(value ?? 0);
}
