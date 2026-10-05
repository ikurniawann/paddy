import type { ReactNode } from "react";
import { Breadcrumb } from "@/features/store/components/listing/breadcrumb";

/** Kerangka halaman konten statis (About, How to order, FAQ, Contact). */
export function StaticPage({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-[1100px] px-4 pt-6 pb-20 lg:px-7">
      <Breadcrumb crumbs={[{ label: title }]} />
      <header className="mt-10 mb-10 text-center">
        <h1 className="text-[30px] leading-tight font-semibold text-[#111] lg:text-[42px]">{title}</h1>
        {intro ? <p className="mx-auto mt-3 max-w-2xl text-[16px] text-[#555]">{intro}</p> : null}
      </header>
      {children}
    </div>
  );
}
