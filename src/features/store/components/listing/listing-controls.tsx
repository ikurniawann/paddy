"use client";

import { useId, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { formatRupiah } from "@/lib/store/types";
import { useStore } from "@/features/store/components/store-context";
import { listingQuery } from "@/features/store/lib/href";

export type ListingState = { q: string; sort: string; min: number | null; max: number | null };

const SORT_OPTIONS = [
  { value: "newest", label: "Urutkan menurut yang terbaru" },
  { value: "price_asc", label: "Harga terendah" },
  { value: "price_desc", label: "Harga tertinggi" },
  { value: "name", label: "Nama A–Z" },
];

export function SortSelect({ path, state }: { path: string; state: ListingState }) {
  const router = useRouter();
  const { href } = useStore();
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        Urutkan produk
      </label>
      <select
        id={id}
        value={state.sort}
        onChange={(event) =>
          router.push(href(`${path}${listingQuery({ ...state, sort: event.target.value, page: 1 })}`))
        }
        className="store-select-pink h-[50px] w-full cursor-pointer border px-3 text-[15px] sm:w-[280px]"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function roundStep(value: number, step: number, mode: "floor" | "ceil") {
  return mode === "floor" ? Math.floor(value / step) * step : Math.ceil(value / step) * step;
}

export function PriceFilter({
  path,
  state,
  range,
}: {
  path: string;
  state: ListingState;
  range: { min: number; max: number };
}) {
  const router = useRouter();
  const { href } = useStore();
  const step = 1000;
  const floor = roundStep(range.min, step, "floor");
  const ceil = Math.max(roundStep(range.max, step, "ceil"), floor + step);
  const [low, setLow] = useState(state.min ?? floor);
  const [high, setHigh] = useState(state.max ?? ceil);
  const minId = useId();
  const maxId = useId();
  const span = ceil - floor || 1;
  const leftPct = ((Math.min(Math.max(low, floor), ceil) - floor) / span) * 100;
  const rightPct = ((Math.min(Math.max(high, floor), ceil) - floor) / span) * 100;

  function apply() {
    const min = Math.max(0, Math.min(low, high));
    const max = Math.max(low, high);
    router.push(
      href(
        `${path}${listingQuery({
          ...state,
          min: min > floor ? min : null,
          max: max < ceil ? max : null,
          page: 1,
        })}`
      )
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        apply();
      }}
    >
      <div className="relative mx-[7px] mt-2 h-[14px]">
        <div className="absolute top-1/2 right-0 left-0 h-[6px] -translate-y-1/2 rounded-full bg-[#eee]" />
        <div
          className="absolute top-1/2 h-[6px] -translate-y-1/2 rounded-full bg-[var(--store-pink-soft)]"
          style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
        />
        <input
          type="range"
          aria-label="Harga minimum"
          min={floor}
          max={ceil}
          step={step}
          value={Math.min(low, high)}
          onChange={(event) => setLow(Math.min(Number(event.target.value), high))}
          className="store-range"
        />
        <input
          type="range"
          aria-label="Harga maksimum"
          min={floor}
          max={ceil}
          step={step}
          value={Math.max(high, low)}
          onChange={(event) => setHigh(Math.max(Number(event.target.value), low))}
          className="store-range"
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={minId} className="sr-only">
            Harga minimum
          </label>
          <input
            id={minId}
            inputMode="numeric"
            value={`Rp ${low.toLocaleString("id-ID")}`}
            onChange={(event) => setLow(Number(event.target.value.replace(/\D/g, "")) || 0)}
            className="h-[36px] w-full border px-2 text-[13px]"
          />
          <span className="mt-1 block text-[13px] font-semibold">Min. Harga</span>
        </div>
        <div>
          <label htmlFor={maxId} className="sr-only">
            Harga maksimum
          </label>
          <input
            id={maxId}
            inputMode="numeric"
            value={`Rp ${high.toLocaleString("id-ID")}`}
            onChange={(event) => setHigh(Number(event.target.value.replace(/\D/g, "")) || 0)}
            className="h-[36px] w-full border px-2 text-[13px]"
          />
          <span className="mt-1 block text-[13px] font-semibold">Maks. Harga</span>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[12px] text-[var(--store-muted)]">
          {formatRupiah(floor)} – {formatRupiah(ceil)}
        </span>
        <button
          type="submit"
          className="rounded-md bg-[var(--store-pink)] px-4 py-1.5 text-[13px] font-semibold text-white uppercase hover:bg-[var(--store-pink-dark)]"
        >
          Saring
        </button>
      </div>
    </form>
  );
}

/** Panel filter: selalu tampil di desktop, bisa dilipat di mobile. */
export function FilterPanel({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className="flex justify-center lg:hidden">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="store-filter-panel"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 py-2 text-[16px] font-semibold tracking-[0.06em] text-[#555] uppercase"
        >
          <SlidersHorizontal className="h-5 w-5" aria-hidden />
          Filter produk
        </button>
      </div>
      <div id="store-filter-panel" className={`${open ? "block" : "hidden"} mt-4 lg:mt-0 lg:block`}>
        {children}
      </div>
    </div>
  );
}
