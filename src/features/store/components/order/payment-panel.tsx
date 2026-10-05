"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { AlertTriangle, Check, CheckCircle2, Copy, Loader2, Upload } from "lucide-react";
import { formatRupiah, type StoreBankAccount } from "@/lib/store/types";
import { WhatsAppIcon } from "@/features/store/components/icons";
import { formatCountdown } from "@/features/store/lib/order-status";
import { whatsappHref } from "@/features/store/lib/href";
import { useHydrated } from "@/features/store/components/use-cart";

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          // clipboard tidak tersedia (http / izin) — abaikan
        }
      }}
      className="inline-flex items-center gap-1 rounded-md border border-[var(--store-pink)] px-2.5 py-1 text-[12px] font-semibold text-[var(--store-pink)] hover:bg-[var(--store-pink-tint)]"
      aria-label={label}
    >
      {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
      {copied ? "Disalin" : "Salin"}
    </button>
  );
}

function Countdown({ dueAt }: { dueAt: string }) {
  const hydrated = useHydrated();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const left = new Date(dueAt).getTime() - now;
  const text = formatCountdown(left);
  const due = new Date(dueAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });
  if (!hydrated) return <div className="h-[62px] rounded-md bg-amber-50" aria-hidden />;
  return (
    <div className="rounded-md bg-amber-50 px-4 py-3 text-[14px] text-amber-900" aria-live="off">
      {text ? (
        <p>
          Selesaikan pembayaran dalam <strong className="tabular-nums">{text}</strong>
        </p>
      ) : (
        <p className="font-semibold">Batas waktu pembayaran sudah lewat.</p>
      )}
      <p className="text-[13px]">Batas bayar: {due} WIB</p>
    </div>
  );
}

function ProofUpload({ token, onUploaded }: { token: string; onUploaded: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputId = useId();

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function pick(next: File | null) {
    setError(null);
    if (!next) {
      setFile(null);
      setPreview(null);
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(next.type)) {
      setError("Format harus JPG, PNG, atau WebP.");
      return;
    }
    if (next.size > 5 * 1024 * 1024) {
      setError("Ukuran maksimal 5 MB.");
      return;
    }
    setFile(next);
    setPreview(URL.createObjectURL(next));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Pilih foto bukti transfer.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch(`/api/public/store/order/${token}/proof`, { method: "POST", body });
      const json = (await response.json().catch(() => null)) as { success: boolean; error?: string } | null;
      if (!json?.success) {
        setError(json?.error ?? "Gagal mengunggah bukti — coba lagi.");
        setBusy(false);
        return;
      }
      onUploaded();
    } catch {
      setError("Koneksi bermasalah — coba lagi.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label
        htmlFor={inputId}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-[var(--store-pink-soft)] bg-[var(--store-pink-tint)] px-4 py-6 text-center text-[14px] text-[#555] hover:border-[var(--store-pink)]"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Pratinjau bukti transfer" width={240} height={240} className="max-h-60 w-auto rounded object-contain" />
        ) : (
          <Upload className="h-8 w-8 text-[var(--store-pink)]" aria-hidden />
        )}
        <span>{file ? file.name : "Pilih foto bukti transfer (JPG/PNG/WebP, maks 5 MB)"}</span>
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => pick(event.target.files?.[0] ?? null)}
      />
      {error ? (
        <p role="alert" className="text-[13px] text-[#c00]">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy || !file}
        className="flex h-[46px] w-full items-center justify-center gap-2 rounded-md bg-[var(--store-pink)] text-[15px] font-semibold text-white uppercase hover:bg-[var(--store-pink-dark)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />}
        {busy ? "Mengunggah…" : "Kirim bukti transfer"}
      </button>
    </form>
  );
}

export function ManualTransferPanel({
  token,
  orderNumber,
  total,
  dueAt,
  bankAccounts,
  whatsapp,
  proofUploaded,
  onProofUploaded,
}: {
  token: string;
  orderNumber: string;
  total: number;
  dueAt: string | null;
  bankAccounts: StoreBankAccount[];
  whatsapp: string;
  proofUploaded: boolean;
  onProofUploaded: () => void;
}) {
  const wa = whatsappHref(whatsapp, `Halo Paddy, saya sudah transfer untuk pesanan ${orderNumber} sebesar ${formatRupiah(total)}.`);
  return (
    <section className="space-y-5 border border-[var(--store-border)] p-5 lg:p-6" aria-labelledby="payment-title">
      <h2 id="payment-title" className="text-[18px] font-semibold text-[#111]">
        Pembayaran — Transfer bank
      </h2>
      {dueAt ? <Countdown dueAt={dueAt} /> : null}

      <div>
        <p className="text-[14px] text-[#555]">Total yang harus ditransfer</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <span className="text-[26px] font-bold text-[var(--store-pink)] tabular-nums">{formatRupiah(total)}</span>
          <CopyButton value={String(Math.round(total))} label="Salin total transfer" />
        </div>
        <p className="mt-1 text-[13px] text-[#777]">Transfer sesuai nominal agar verifikasi lebih cepat.</p>
      </div>

      <div className="space-y-3">
        {bankAccounts.length === 0 ? (
          <p className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-[14px] text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Rekening belum diatur — hubungi admin.
          </p>
        ) : (
          bankAccounts.map((account, index) => (
            <div key={`${account.bank}-${index}`} className="rounded-md border border-[var(--store-border)] p-4">
              <p className="text-[13px] font-semibold tracking-[0.06em] text-[#777] uppercase">{account.bank}</p>
              {account.number ? (
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <span className="text-[20px] font-bold tracking-[0.04em] text-[#111] tabular-nums">{account.number}</span>
                  <CopyButton value={account.number.replace(/\s/g, "")} label={`Salin nomor rekening ${account.bank}`} />
                </div>
              ) : (
                <p className="mt-2 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  Rekening belum diatur — hubungi admin.
                </p>
              )}
              {account.holder ? <p className="mt-1 text-[14px] text-[#444]">a.n. {account.holder}</p> : null}
              {account.note ? <p className="mt-1 text-[12px] text-[#888]">{account.note}</p> : null}
            </div>
          ))
        )}
      </div>

      <div>
        <h3 className="mb-3 text-[15px] font-semibold text-[#111]">Unggah bukti transfer</h3>
        {proofUploaded ? (
          <p className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-[14px] text-green-800" role="status">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Bukti terkirim, menunggu verifikasi admin.
          </p>
        ) : (
          <ProofUpload token={token} onUploaded={onProofUploaded} />
        )}
      </div>

      {wa ? (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-[46px] w-full items-center justify-center gap-2 rounded-md bg-[var(--store-wa)] text-[15px] font-semibold text-white hover:brightness-95"
        >
          <WhatsAppIcon className="h-5 w-5" />
          Konfirmasi via WhatsApp
        </a>
      ) : null}
    </section>
  );
}
