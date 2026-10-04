'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Loader2, Plus, Save, Search, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogFooter,
  DialogPanel,
  DialogPanelBody,
  DialogPanelDescription,
  DialogPanelHeader,
  DialogPanelTitle,
} from '@/components/ui/dialog';
import { useStoreStock } from '@/features/pos/store-stock/queries';
import { formatQty, stockCellClass } from '@/features/pos/store-stock/helpers';
import type { StockLocation } from '@/features/pos/store-stock/types';
import { useCreateStockTransfer } from '../mutations';
import {
  addDraftLine,
  draftTotalQty,
  lineExceedsStock,
  lineStockAt,
  removeDraftLine,
  updateDraftLineQty,
  validateTransferDraft,
  type TransferDraftLine,
} from '../helpers';

const MAX_PICKER_RESULTS = 30;

const selectClass =
  'h-10 w-full rounded-lg border border-gray-200/80 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-pink-300 focus:ring-1 focus:ring-pink-100 disabled:opacity-50';

export function NewTransferDialog({
  open,
  locations,
  locationsLoading,
  onClose,
  onCreated,
}: {
  open: boolean;
  locations: StockLocation[];
  locationsLoading: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogPanel size="xl">
        <DialogPanelHeader>
          <DialogPanelTitle>Transfer Baru</DialogPanelTitle>
          <DialogPanelDescription>
            Pindahkan stok produk multi-toko antar lokasi. Stok asal berkurang saat transfer dikirim,
            stok tujuan bertambah saat transfer diterima.
          </DialogPanelDescription>
        </DialogPanelHeader>
        {open && locationsLoading && locations.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin text-pink-500" />
            Memuat lokasi...
          </div>
        ) : open ? (
          <NewTransferForm locations={locations} onClose={onClose} onCreated={onCreated} />
        ) : null}
      </DialogPanel>
    </Dialog>
  );
}

function NewTransferForm({
  locations,
  onClose,
  onCreated,
}: {
  locations: StockLocation[];
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [fromId, setFromId] = useState(() => locations[0]?.warehouse_id ?? '');
  const [toId, setToId] = useState('');
  const [lines, setLines] = useState<TransferDraftLine[]>([]);
  const [notes, setNotes] = useState('');
  const [pickerQuery, setPickerQuery] = useState('');
  const [pickerTerm, setPickerTerm] = useState('');
  const createMutation = useCreateStockTransfer();

  useEffect(() => {
    const timeout = window.setTimeout(() => setPickerTerm(pickerQuery.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [pickerQuery]);

  const pickerQueryResult = useStoreStock(pickerTerm);
  const pickerResults = useMemo(() => {
    const rows: Array<Omit<TransferDraftLine, 'qty'>> = [];
    for (const product of pickerQueryResult.data?.products ?? []) {
      for (const sku of product.skus) {
        if (!sku.is_active) continue;
        rows.push({
          sku_id: sku.sku_id,
          sku: sku.sku,
          sku_name: sku.sku_name || sku.sku,
          product_name: product.product_name,
          stock_by_location: sku.stock_by_location,
        });
      }
    }
    return rows;
  }, [pickerQueryResult.data]);

  const fromName = locations.find((location) => location.warehouse_id === fromId)?.warehouse_name ?? '-';
  const validationError = validateTransferDraft({ fromId, toId, lines });
  const hasExceeded = fromId ? lines.some((line) => lineExceedsStock(line, fromId)) : false;
  const lineIds = new Set(lines.map((line) => line.sku_id));

  const handleFromChange = (value: string) => {
    setFromId(value);
    if (value && value === toId) setToId('');
  };

  const submit = (send: boolean) => {
    if (validationError) {
      toast.error(validationError);
      return;
    }
    createMutation.mutate(
      {
        from_warehouse_id: fromId,
        to_warehouse_id: toId,
        items: lines.map((line) => ({ sku_id: line.sku_id, qty: line.qty })),
        notes: notes.trim() || undefined,
        send,
      },
      {
        onSuccess: (result) => {
          toast.success(
            send
              ? `Transfer ${result.transfer_no} dikirim`
              : `Transfer ${result.transfer_no} disimpan sebagai draft`
          );
          onCreated(result.id);
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : 'Gagal membuat transfer stok');
        },
      }
    );
  };

  return (
    <>
      <DialogPanelBody className="max-h-[70vh] space-y-5">
        <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <div>
            <label htmlFor="transfer-from" className="mb-1 block text-xs text-gray-500">
              Dari
            </label>
            <select
              id="transfer-from"
              value={fromId}
              onChange={(event) => handleFromChange(event.target.value)}
              className={selectClass}
            >
              <option value="">Pilih lokasi asal</option>
              {locations.map((location) => (
                <option key={location.warehouse_id} value={location.warehouse_id}>
                  {location.warehouse_name}
                </option>
              ))}
            </select>
          </div>
          <ArrowRight className="mx-auto mb-3 hidden h-4 w-4 text-gray-400 sm:block" />
          <div>
            <label htmlFor="transfer-to" className="mb-1 block text-xs text-gray-500">
              Ke
            </label>
            <select
              id="transfer-to"
              value={toId}
              onChange={(event) => setToId(event.target.value)}
              className={selectClass}
            >
              <option value="">Pilih lokasi tujuan</option>
              {locations
                .filter((location) => location.warehouse_id !== fromId)
                .map((location) => (
                  <option key={location.warehouse_id} value={location.warehouse_id}>
                    {location.warehouse_name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200/80">
          <div className="border-b border-gray-100 px-3 py-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Cari produk multi-toko, SKU, atau barcode..."
                value={pickerQuery}
                onChange={(event) => setPickerQuery(event.target.value)}
                className="h-9 pl-9"
              />
              {pickerQueryResult.isFetching ? (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
              ) : null}
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {pickerQueryResult.isLoading ? (
              <p className="px-3 py-6 text-center text-sm text-gray-400">Mencari barang...</p>
            ) : pickerResults.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-gray-400">
                {pickerTerm ? 'Tidak ada varian yang cocok' : 'Belum ada produk multi-toko'}
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {pickerResults.slice(0, MAX_PICKER_RESULTS).map((row) => {
                  const available = lineStockAt(row, fromId);
                  const added = lineIds.has(row.sku_id);
                  return (
                    <li key={row.sku_id} className="flex items-center gap-3 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">{row.product_name}</p>
                        <p className="truncate text-xs text-gray-500">
                          {row.sku_name} · {row.sku}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium tabular-nums ${stockCellClass(available)}`}
                        title={`Stok di ${fromName}`}
                      >
                        {fromId ? `Stok ${formatQty(available)}` : '-'}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 shrink-0 gap-1"
                        disabled={!fromId || available <= 0}
                        onClick={() => setLines((prev) => addDraftLine(prev, row))}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {added ? '+1' : 'Tambah'}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
            {pickerResults.length > MAX_PICKER_RESULTS ? (
              <p className="border-t border-gray-100 px-3 py-2 text-center text-xs text-gray-400">
                Menampilkan {MAX_PICKER_RESULTS} dari {pickerResults.length} varian — persempit pencarian.
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Barang ditransfer</p>
            <p className="text-xs text-gray-500">
              {lines.length} varian · {formatQty(draftTotalQty(lines))} unit
            </p>
          </div>
          {lines.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-200 px-3 py-6 text-center text-sm text-gray-400">
              Cari lalu tambahkan varian di atas.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="min-w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Barang</th>
                    <th className="px-3 py-2 text-right font-semibold">Stok asal</th>
                    <th className="px-3 py-2 text-right font-semibold">Qty</th>
                    <th className="w-10 px-2 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lines.map((line) => {
                    const available = lineStockAt(line, fromId);
                    const exceeded = lineExceedsStock(line, fromId);
                    return (
                      <tr key={line.sku_id} className={exceeded ? 'bg-red-50/50' : undefined}>
                        <td className="px-3 py-2">
                          <p className="font-medium text-gray-900">{line.product_name}</p>
                          <p className="text-xs text-gray-500">
                            {line.sku_name} · {line.sku}
                          </p>
                          {exceeded ? (
                            <p className="mt-0.5 text-xs text-red-600">
                              Melebihi stok di {fromName} ({formatQty(available)})
                            </p>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-gray-600">
                          {formatQty(available)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={available || undefined}
                            step={1}
                            value={line.qty === 0 ? '' : String(line.qty)}
                            onChange={(event) =>
                              setLines((prev) =>
                                updateDraftLineQty(prev, line.sku_id, Number(event.target.value || 0))
                              )
                            }
                            aria-invalid={exceeded || line.qty <= 0}
                            className="ml-auto h-9 w-24 text-right"
                          />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setLines((prev) => removeDraftLine(prev, line.sku_id))}
                            aria-label={`Hapus ${line.sku}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="transfer-notes" className="mb-1 block text-xs text-gray-500">
            Catatan (opsional)
          </label>
          <Textarea
            id="transfer-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Contoh: restock akhir pekan"
            rows={2}
          />
        </div>

        {validationError && (lines.length > 0 || toId) ? (
          <div
            className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
              hasExceeded ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'
            }`}
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{validationError}</span>
          </div>
        ) : null}
      </DialogPanelBody>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={createMutation.isPending}>
          Batal
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => submit(false)}
          disabled={Boolean(validationError) || createMutation.isPending}
          className="gap-2"
        >
          {createMutation.isPending && createMutation.variables?.send === false ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Simpan Draft
        </Button>
        <Button
          type="button"
          onClick={() => submit(true)}
          disabled={Boolean(validationError) || createMutation.isPending}
          className="purchasing-main-button gap-2"
        >
          {createMutation.isPending && createMutation.variables?.send === true ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Kirim Sekarang
        </Button>
      </DialogFooter>
    </>
  );
}
