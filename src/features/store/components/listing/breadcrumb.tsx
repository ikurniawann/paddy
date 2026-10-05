import { StoreLink } from "@/features/store/components/store-context";

export type Crumb = { label: string; href?: string };

export function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  const all: Crumb[] = [{ label: "Beranda", href: "/" }, ...crumbs];
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center justify-center gap-x-3 text-[17px] tracking-[0.02em] uppercase lg:justify-start lg:text-[18px]">
        {all.map((crumb, index) => {
          const last = index === all.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className="flex items-center gap-3">
              {last || !crumb.href ? (
                <span aria-current={last ? "page" : undefined} className={last ? "font-semibold text-[#111]" : "text-[#888]"}>
                  {crumb.label}
                </span>
              ) : (
                <StoreLink href={crumb.href} className="text-[#888] hover:text-[var(--store-pink)]">
                  {crumb.label}
                </StoreLink>
              )}
              {!last ? (
                <span aria-hidden className="text-[#aaa]">
                  /
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
