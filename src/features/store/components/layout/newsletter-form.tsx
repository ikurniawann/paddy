"use client";

import { useId, type FormEvent } from "react";
import { ChevronRight } from "lucide-react";
import { useStore } from "@/features/store/components/store-context";

/** Newsletter tanpa backend: hanya konfirmasi ke pengunjung. */
export function NewsletterForm() {
  const { toast } = useStore();
  const id = useId();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.currentTarget.reset();
    toast("Terima kasih! Nantikan kabar terbaru dari Paddy.");
  }
  return (
    <form onSubmit={submit} className="flex h-[46px] w-full max-w-[320px]">
      <label htmlFor={id} className="sr-only">
        Email untuk newsletter
      </label>
      <input
        id={id}
        type="email"
        required
        placeholder="Subscribe your email"
        className="h-full min-w-0 flex-1 rounded-none border px-4 text-sm"
      />
      <button
        type="submit"
        aria-label="Berlangganan newsletter"
        className="flex h-full w-[56px] shrink-0 items-center justify-center border border-white/70 bg-[var(--store-pink)] text-white hover:bg-[var(--store-pink-dark)]"
      >
        <ChevronRight className="h-6 w-6" />
      </button>
    </form>
  );
}
