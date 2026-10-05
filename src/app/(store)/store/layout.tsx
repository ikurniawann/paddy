import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Fira_Sans } from "next/font/google";
import "./store.css";
import { StoreProviders } from "@/features/store/components/store-context";
import { SiteHeader } from "@/features/store/components/layout/site-header";
import { SiteFooter } from "@/features/store/components/layout/site-footer";
import { WhatsAppFloat } from "@/features/store/components/layout/whatsapp-float";
import {
  getRequestOrigin,
  getStoreBase,
  loadStoreChrome,
  STORE_DEFAULT_DESCRIPTION,
  STORE_NAME,
} from "@/features/store/lib/server";

const firaSans = Fira_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-store",
});

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(await getRequestOrigin()),
    title: { default: STORE_NAME, template: `%s | ${STORE_NAME}` },
    description: STORE_DEFAULT_DESCRIPTION,
    applicationName: STORE_NAME,
    robots: { index: true, follow: true },
    icons: { icon: "/favicon.svg?v=paddy2" },
  };
}

export default async function StoreLayout({ children }: { children: ReactNode }) {
  const [base, { nav, settings }] = await Promise.all([getStoreBase(), loadStoreChrome()]);
  return (
    <div className={`paddy-store ${firaSans.variable}`} style={{ fontFamily: "var(--font-store), 'Fira Sans', sans-serif" }}>
      <StoreProviders base={base}>
        <a
          href="#store-main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[90] focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:shadow"
        >
          Langsung ke konten
        </a>
        {settings.announcement ? (
          <div className="bg-[var(--store-indigo)] px-4 py-2 text-center text-[13px] leading-snug font-bold text-white sm:text-[15px]">
            {settings.announcement}
          </div>
        ) : null}
        <SiteHeader nav={nav} />
        <main id="store-main" className="flex-1">
          {children}
        </main>
        <SiteFooter categories={nav.categories} instagram={settings.instagram} whatsapp={settings.whatsapp} />
        <WhatsAppFloat phone={settings.whatsapp} />
      </StoreProviders>
    </div>
  );
}
