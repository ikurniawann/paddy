import type { ReactNode } from "react";

export const inputClass = "h-[46px] w-full rounded-[4px] border px-3 text-[15px]";

export function Field({ label, required, hint, error, children, id }: { label: string; required?: boolean; hint?: string; error?: string; children: ReactNode; id: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[14px] font-semibold text-[#111]">
        {label}
        {required ? (
          <span className="text-[#e00]" aria-hidden>
            {" "}*
          </span>
        ) : (
          <span className="font-normal text-[#888]"> (opsional)</span>
        )}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-[13px] text-[#c00]">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-[12px] text-[#777]">{hint}</p>
      ) : null}
    </div>
  );
}

export function SectionCard({ step, title, children }: { step: number; title: string; children: ReactNode }) {
  return (
    <section className="border border-[var(--store-border)] p-5 lg:p-6" aria-labelledby={`checkout-step-${step}`}>
      <h2 id={`checkout-step-${step}`} className="mb-5 flex items-center gap-3 text-[18px] font-semibold text-[#111]">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--store-pink)] text-[14px] text-white">{step}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function MethodCard({
  active,
  onSelect,
  icon,
  title,
  subtitle,
}: {
  active: boolean;
  onSelect: () => void;
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-md border-2 p-4 transition ${
        active ? "border-[var(--store-pink)] bg-[var(--store-pink-tint)]" : "border-[var(--store-border)] hover:border-[var(--store-pink-soft)]"
      }`}
    >
      <input type="radio" name="shipping-method" checked={active} onChange={onSelect} className="mt-1 accent-[var(--store-pink)]" />
      <span className="text-[var(--store-pink)]">{icon}</span>
      <span>
        <span className="block text-[15px] font-semibold text-[#111]">{title}</span>
        <span className="block text-[13px] text-[#666]">{subtitle}</span>
      </span>
    </label>
  );
}

