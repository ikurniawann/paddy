"use client";

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import type { StoreNav } from "@/lib/store/types";
import { StoreLink, useStore } from "@/features/store/components/store-context";
import { useCart, useWishlist } from "@/features/store/components/use-cart";

type MenuLink = { label: string; href: string };
type MenuGroup = { label: string; href?: string; items?: MenuLink[] };

export const ABOUT_LINKS: MenuLink[] = [
  { label: "About Us", href: "/about-us" },
  { label: "How to Order", href: "/how-to-order" },
  { label: "Cek Pesanan", href: "/track-order" },
  { label: "FAQ", href: "/frequently-asked-questions-faqs" },
  { label: "Contact Us", href: "/contact-us" },
];

function buildMenu(nav: StoreNav): MenuGroup[] {
  return [
    { label: "Best Seller", href: "/catalogues/best-seller" },
    {
      label: "Products",
      items: [
        ...nav.categories.map((c) => ({ label: c.name, href: `/product-category/${c.slug}` })),
        { label: "Semua Produk", href: "/shop" },
      ],
    },
    { label: "Catalogues", items: nav.catalogues.map((c) => ({ label: c.name, href: `/catalogues/${c.slug}` })) },
    { label: "About", items: ABOUT_LINKS },
  ];
}

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1.5 -right-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--store-pink)] px-1 text-[10px] leading-none font-semibold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function SearchForm({ autoFocus, onDone }: { autoFocus?: boolean; onDone?: () => void }) {
  const router = useRouter();
  const { href } = useStore();
  const id = useId();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = String(new FormData(event.currentTarget).get("q") ?? "").trim();
    router.push(href(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop"));
    onDone?.();
  }
  return (
    <form role="search" onSubmit={submit} className="flex items-center gap-2">
      <label htmlFor={id} className="sr-only">
        Cari produk
      </label>
      <input
        id={id}
        name="q"
        type="search"
        autoFocus={autoFocus}
        placeholder="Pencarian..."
        className="h-10 w-full border-0 px-2 text-sm placeholder:text-[var(--store-muted)] focus:shadow-none"
        style={{ borderWidth: 0 }}
      />
      <button type="submit" aria-label="Cari" className="flex h-10 w-10 shrink-0 items-center justify-center text-[var(--store-text)]">
        <Search className="h-5 w-5" strokeWidth={2.2} />
      </button>
    </form>
  );
}

function DesktopMenu({ group }: { group: MenuGroup }) {
  const [open, setOpen] = useState(false);
  const linkClass = "flex items-center gap-1 px-3 py-2 text-[17px] font-semibold text-[#111] hover:text-[var(--store-pink)]";
  if (!group.items) {
    return (
      <StoreLink href={group.href ?? "/"} className={linkClass}>
        {group.label}
      </StoreLink>
    );
  }
  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        type="button"
        className={linkClass}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
      >
        {group.label}
        <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
      </button>
      {open && group.items.length > 0 ? (
        <div className="absolute top-full left-1/2 z-50 min-w-[220px] -translate-x-1/2 pt-2">
          <ul className="max-h-[70vh] overflow-auto rounded-md border border-[var(--store-border)] bg-white py-2 shadow-lg">
            {group.items.map((item) => (
              <li key={item.href}>
                <StoreLink
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block px-5 py-2 text-[15px] text-[var(--store-text)] hover:bg-[var(--store-pink-tint)] hover:text-[var(--store-pink)]"
                >
                  {item.label}
                </StoreLink>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function MobileDrawer({ menu, onClose }: { menu: MenuGroup[]; onClose: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <button type="button" aria-label="Tutup menu" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <nav className="store-drawer absolute inset-y-0 left-0 flex w-[85%] max-w-[340px] flex-col overflow-y-auto bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--store-border)] px-4 py-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/paddy-wordmark.png" alt="Paddy" width={96} height={32} className="h-8 w-auto" />
          <button ref={closeRef} type="button" aria-label="Tutup menu" onClick={onClose} className="p-2">
            <X className="h-6 w-6" />
          </button>
        </div>
        <ul className="flex-1">
          {menu.map((group) => (
            <li key={group.label} className="border-b border-[var(--store-border)]">
              {group.items ? (
                <>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-5 py-3.5 text-left text-base font-semibold"
                    aria-expanded={expanded === group.label}
                    onClick={() => setExpanded((v) => (v === group.label ? null : group.label))}
                  >
                    {group.label}
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${expanded === group.label ? "rotate-180" : ""}`}
                      aria-hidden
                    />
                  </button>
                  {expanded === group.label ? (
                    <ul className="bg-[var(--store-pink-tint)] pb-2">
                      {group.items.map((item) => (
                        <li key={item.href}>
                          <StoreLink href={item.href} onClick={onClose} className="block px-8 py-2.5 text-[15px]">
                            {item.label}
                          </StoreLink>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              ) : (
                <StoreLink href={group.href ?? "/"} onClick={onClose} className="block px-5 py-3.5 text-base font-semibold">
                  {group.label}
                </StoreLink>
              )}
            </li>
          ))}
          <li className="border-b border-[var(--store-border)]">
            <StoreLink href="/wishlist" onClick={onClose} className="flex items-center gap-2 px-5 py-3.5 text-base font-semibold">
              <Heart className="h-4 w-4" aria-hidden /> Wishlist
            </StoreLink>
          </li>
        </ul>
      </nav>
    </div>
  );
}

export function SiteHeader({ nav }: { nav: StoreNav }) {
  const menu = buildMenu(nav);
  const pathname = usePathname();
  const cart = useCart();
  const wishlist = useWishlist();
  const [searchOpen, setSearchOpen] = useState(false);
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  // Drawer otomatis tertutup saat berpindah halaman (path berubah).
  const drawerOpen = drawerPath !== null && drawerPath === pathname;
  const closeDrawer = useCallback(() => setDrawerPath(null), []);
  const iconClass = "relative flex h-10 w-10 items-center justify-center text-[#111] hover:text-[var(--store-pink)]";

  return (
    <header className="sticky top-0 z-40 bg-white">
      <div className="mx-auto max-w-[1440px] px-4">
        <div className="relative flex h-[72px] items-center border-b border-[var(--store-border)] lg:h-[100px]">
          {/* Mobile: hamburger kiri */}
          <button
            type="button"
            className="-ml-2 flex h-10 w-10 items-center justify-center lg:hidden"
            aria-label="Buka menu"
            onClick={() => setDrawerPath(pathname)}
          >
            <Menu className="h-6 w-6" strokeWidth={1.8} />
          </button>

          <StoreLink
            href="/"
            aria-label="Paddy — beranda"
            className="absolute left-1/2 -translate-x-1/2 lg:static lg:translate-x-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logos/paddy-wordmark.png"
              alt="Paddy"
              width={165}
              height={55}
              className="h-[38px] w-auto lg:h-[54px]"
            />
          </StoreLink>

          <nav aria-label="Menu utama" className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 lg:flex">
            {menu.map((group) => (
              <DesktopMenu key={group.label} group={group} />
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1 lg:gap-3">
            <button
              type="button"
              className={`${iconClass} hidden lg:flex`}
              aria-label="Cari produk"
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen((v) => !v)}
            >
              <Search className="h-[22px] w-[22px]" strokeWidth={2} />
            </button>
            <StoreLink href="/wishlist" className={`${iconClass} hidden lg:flex`} aria-label={`Wishlist (${wishlist.count})`}>
              <Heart className="h-[23px] w-[23px]" strokeWidth={2} />
              <CountBadge count={wishlist.count} />
            </StoreLink>
            <StoreLink href="/track-order" className={`${iconClass} hidden lg:flex`} aria-label="Cek pesanan">
              <User className="h-[23px] w-[23px]" strokeWidth={2} />
            </StoreLink>
            <StoreLink href="/cart" className={`${iconClass} -mr-2 lg:mr-0`} aria-label={`Keranjang (${cart.count})`}>
              <ShoppingBag className="h-[25px] w-[25px]" strokeWidth={1.8} />
              <CountBadge count={cart.count} />
            </StoreLink>
          </div>
        </div>

        {/* Bar pencarian: selalu tampil di mobile (seperti paddy.id), toggle di desktop. */}
        <div className="border-b border-[var(--store-border)] lg:hidden">
          <SearchForm />
        </div>
        {searchOpen ? (
          <div className="hidden border-b border-[var(--store-border)] py-2 lg:block">
            <div className="mx-auto max-w-2xl">
              <SearchForm autoFocus onDone={() => setSearchOpen(false)} />
            </div>
          </div>
        ) : null}
      </div>
      {drawerOpen ? <MobileDrawer menu={menu} onClose={closeDrawer} /> : null}
    </header>
  );
}
