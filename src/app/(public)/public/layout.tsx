import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hubungi Paddy",
  description: "Kirim permintaan pesanan custom, pembelian korporat/grosir, atau kerja sama ke Paddy.",
};

export default function PublicFormLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
