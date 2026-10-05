import { WhatsAppIcon } from "@/features/store/components/icons";
import { whatsappHref } from "@/features/store/lib/href";

/** Tombol "Contact us" mengambang — hanya bila nomor WhatsApp toko diatur. */
export function WhatsAppFloat({ phone }: { phone: string }) {
  const href = whatsappHref(phone, "Halo Paddy, saya mau tanya tentang produk di website.");
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group fixed right-4 bottom-5 z-50 flex items-center gap-3 lg:right-7 lg:bottom-7"
      aria-label="Hubungi Paddy via WhatsApp"
    >
      <span className="hidden rounded-full bg-white px-4 py-1.5 text-[15px] shadow-md sm:block">Contact us</span>
      <span className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-[var(--store-wa)] text-white shadow-lg transition-transform group-hover:scale-105">
        <WhatsAppIcon className="h-8 w-8" />
      </span>
    </a>
  );
}

export function PaymentLogos() {
  return (
    <div className="flex justify-center px-4 py-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/store/icons/payment-strip.webp"
        alt="Metode pembayaran: Visa, Mastercard, DANA, GoPay, ShopeePay, OVO, LinkAja, Alfamart, Indomaret, Mandiri, BRI, BNI, Permata"
        width={630}
        height={52}
        loading="lazy"
        className="h-auto w-full max-w-[630px]"
      />
    </div>
  );
}
