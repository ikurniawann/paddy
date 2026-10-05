import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import type { StoreNavItem } from "@/lib/store/types";
import { StoreLink } from "@/features/store/components/store-context";
import { InstagramIcon, WhatsAppIcon } from "@/features/store/components/icons";
import { NewsletterForm } from "@/features/store/components/layout/newsletter-form";
import { whatsappHref } from "@/features/store/lib/href";

const SUPPORT_LINKS = [
  { label: "About Us", href: "/about-us" },
  { label: "Cek Pesanan", href: "/track-order" },
  { label: "How to Order", href: "/how-to-order" },
  { label: "Frequently Asked Questions (FAQs)", href: "/frequently-asked-questions-faqs" },
  { label: "Contact Us", href: "/contact-us" },
];

type Column = { title: string; body: ReactNode };

function LinkList({ links }: { links: Array<{ label: string; href: string }> }) {
  return (
    <ul className="space-y-1.5">
      {links.map((link) => (
        <li key={link.href}>
          <StoreLink href={link.href} className="text-[15px] text-white/95 hover:text-white hover:underline">
            {link.label}
          </StoreLink>
        </li>
      ))}
    </ul>
  );
}

export function SiteFooter({
  categories,
  instagram,
  whatsapp,
}: {
  categories: StoreNavItem[];
  instagram: string;
  whatsapp: string;
}) {
  const wa = whatsappHref(whatsapp);
  const columns: Column[] = [
    {
      title: "Paddy",
      body: (
        <address className="space-y-1.5 text-[15px] leading-relaxed text-white/95 not-italic">
          <p>Paddy HQ</p>
          <p>Jl. Kopo Permai III F2 No.15</p>
          <p>Kec. Cangkuang Kulon, Kab. Bandung</p>
          <p>Jawa Barat 40227</p>
        </address>
      ),
    },
    {
      title: "Products",
      body: (
        <LinkList
          links={[
            ...categories.slice(0, 8).map((c) => ({ label: c.name, href: `/product-category/${c.slug}` })),
            { label: "Semua Produk", href: "/shop" },
          ]}
        />
      ),
    },
    { title: "Support", body: <LinkList links={SUPPORT_LINKS} /> },
    {
      title: "Newsletter",
      body: (
        <div>
          <NewsletterForm />
          <div className="mt-8 flex items-center gap-4">
            {instagram ? (
              <a href={instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram Paddy" className="text-white hover:opacity-80">
                <InstagramIcon className="h-7 w-7" />
              </a>
            ) : null}
            {wa ? (
              <a href={wa} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp Paddy" className="text-white hover:opacity-80">
                <WhatsAppIcon className="h-7 w-7" />
              </a>
            ) : null}
          </div>
        </div>
      ),
    },
  ];

  return (
    <footer className="bg-[var(--store-indigo)] text-white">
      <div className="mx-auto max-w-[1440px] px-4 py-10 lg:px-4 lg:pt-12 lg:pb-8">
        {/* Desktop: 4 kolom */}
        <div className="hidden grid-cols-4 gap-8 lg:grid">
          {columns.map((col) => (
            <div key={col.title}>
              <h2 className="text-[20px] font-semibold">{col.title}</h2>
              <span className="mt-3 mb-5 block h-[3px] w-20 bg-[var(--store-pink)]" aria-hidden />
              {col.body}
            </div>
          ))}
        </div>
        {/* Mobile: akordeon */}
        <div className="border-t border-white/80 lg:hidden">
          {columns.map((col) => (
            <details key={col.title} className="group border-b border-white/80">
              <summary className="flex cursor-pointer list-none items-center justify-between px-9 py-3 text-base [&::-webkit-details-marker]:hidden">
                {col.title}
                <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <div className="px-9 pb-5">{col.body}</div>
            </details>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-white/90 lg:mt-6 lg:text-right">
          Copyright © {new Date().getFullYear()} CV Cipta Kreasi Kreatif
        </p>
      </div>
    </footer>
  );
}
