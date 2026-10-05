import type { ReactNode } from "react";
import { StoreLink } from "@/features/store/components/store-context";

export function SectionTitle({ title, subtitle, as: Tag = "h2" }: { title: string; subtitle?: string; as?: "h1" | "h2" }) {
  return (
    <div className="mb-6 text-center lg:mb-8">
      <Tag className="text-[26px] leading-tight font-semibold tracking-[0.01em] text-[#111] lg:text-[42px]">{title}</Tag>
      {subtitle ? <p className="mt-1 text-[18px] text-[#111] lg:text-[15px]">{subtitle}</p> : null}
    </div>
  );
}

export function PinkButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <StoreLink
      href={href}
      className="inline-flex h-[46px] items-center justify-center rounded-md bg-[var(--store-pink)] px-10 text-[17px] font-semibold tracking-[0.02em] text-white uppercase transition hover:bg-[var(--store-pink-dark)]"
    >
      {children}
    </StoreLink>
  );
}

export function ViewMoreButton({ href }: { href: string }) {
  return (
    <div className="mt-10 flex justify-center lg:mt-12">
      <PinkButton href={href}>View more</PinkButton>
    </div>
  );
}
