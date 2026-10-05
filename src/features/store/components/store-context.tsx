"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { Check, X } from "lucide-react";
import { storeHref } from "@/features/store/lib/href";

type ToastAction = { label: string; href: string };
type ToastState = { id: number; message: string; action?: ToastAction } | null;

type StoreContextValue = {
  base: string;
  href: (path: string) => string;
  toast: (message: string, action?: ToastAction) => void;
};

const StoreContext = createContext<StoreContextValue>({
  base: "/store",
  href: (path) => storeHref("/store", path),
  toast: () => {},
});

export function StoreProviders({ base, children }: { base: string; children: ReactNode }) {
  const [current, setCurrent] = useState<ToastState>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((message: string, action?: ToastAction) => {
    if (timer.current) clearTimeout(timer.current);
    setCurrent({ id: Date.now(), message, action });
    timer.current = setTimeout(() => setCurrent(null), 4000);
  }, []);

  const value = useMemo<StoreContextValue>(
    () => ({ base, href: (path: string) => storeHref(base, path), toast }),
    [base, toast]
  );

  return (
    <StoreContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[80] flex justify-center px-4">
        {current ? (
          <div
            key={current.id}
            role="status"
            className="store-toast pointer-events-auto flex max-w-md items-center gap-3 rounded-md bg-[var(--store-text)] px-4 py-3 text-sm text-white shadow-lg"
          >
            <Check className="h-4 w-4 shrink-0 text-[var(--store-pink-soft)]" aria-hidden />
            <span>{current.message}</span>
            {current.action ? (
              <Link
                href={storeHref(base, current.action.href)}
                className="ml-1 font-semibold whitespace-nowrap text-[var(--store-pink-soft)] underline underline-offset-2"
                onClick={() => setCurrent(null)}
              >
                {current.action.label}
              </Link>
            ) : null}
            <button type="button" aria-label="Tutup notifikasi" className="ml-1 opacity-70 hover:opacity-100" onClick={() => setCurrent(null)}>
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
    </StoreContext.Provider>
  );
}

export function useStore() {
  return useContext(StoreContext);
}

/** next/link yang otomatis memakai base path toko. */
export function StoreLink({ href, ...rest }: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
  const { base } = useStore();
  return <Link href={storeHref(base, href)} {...rest} />;
}
