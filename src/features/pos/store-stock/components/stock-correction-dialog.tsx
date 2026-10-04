'use client';

import { useState } from 'react';
import { History, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogFooter,
  DialogPanel,
  DialogPanelBody,
  DialogPanelDescription,
  DialogPanelHeader,
  DialogPanelTitle,
} from '@/components/ui/dialog';
import { useSetLocationStock } from '../mutations';
import { useSkuMovements } from '../queries';
import {
  formatDateTime,
  formatQty,
  formatQtyChange,
  movementTypeLabel,
  parseStockInput,
  stockCellClass,
} from '../helpers';
import type { StockCellSelection } from '../types';

type TabValue = 'koreksi' | 'kartu';

export function StockCorrectionDialog({
  selection,
  onClose,
}: {
  selection: StockCellSelection | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={selection !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogPanel size="lg">
        {selection ? (
          <StockCorrectionContent
            key={`${selection.skuId}:${selection.warehouseId}:${selection.qty}`}
            selection={selection}
            onClose={onClose}
          />
        ) : null}
      </DialogPanel>
    </Dialog>
  );
}

function StockCorrectionContent({
  selection,
  onClose,
}: {
  selection: StockCellSelection;
  onClose: () => void;
}) {
  // Lokasi toko lain: hanya kartu stok (koreksi ditolak server untuk akun toko).
  const [tab, setTab] = useState<TabValue>(selection.canEdit ? 'koreksi' : 'kartu');
  const [qtyInput, setQtyInput] = useState(() => String(selection.qty));
  const [note, setNote] = useState('');
  const setStockMutation = useSetLocationStock();
  const movementsQuery = useSkuMovements(selection.skuId, selection.warehouseId, tab === 'kartu');

  const parsedQty = parseStockInput(qtyInput);
  const invalidQty = qtyInput.trim() !== '' && parsedQty === null;
  const unchanged = parsedQty === selection.qty;
  const diff = parsedQty !== null ? parsedQty - selection.qty : 0;

  const handleSave = () => {
    if (parsedQty === null) return;
    setStockMutation.mutate(
      {
        sku_id: selection.skuId,
        warehouse_id: selection.warehouseId,
        stock_quantity: parsedQty,
        note: note.trim() || undefined,
      },
      {
        onSuccess: (result) => {
          toast.success(
            `Stok ${selection.sku} di ${selection.warehouseName} jadi ${formatQty(result?.quantity_after ?? parsedQty)}`
          );
          onClose();
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : 'Gagal menyimpan koreksi stok');
        },
      }
    );
  };

  return (
    <>
      <DialogPanelHeader>
        <DialogPanelTitle>Koreksi stok</DialogPanelTitle>
        <DialogPanelDescription>
          <span className="font-medium text-gray-700">{selection.productName}</span>
          {' · '}
          {selection.skuName} ({selection.sku}) · {selection.warehouseName}
        </DialogPanelDescription>
      </DialogPanelHeader>
      <DialogPanelBody className="max-h-[65vh] space-y-4">
        <Tabs value={tab} onValueChange={(value) => setTab(value as TabValue)}>
          <TabsList>
            {selection.canEdit ? <TabsTrigger value="koreksi">Koreksi stok</TabsTrigger> : null}
            <TabsTrigger value="kartu">
              <History className="h-3.5 w-3.5" />
              Kartu stok
            </TabsTrigger>
          </TabsList>

          <TabsContent value="koreksi" className="space-y-4 pt-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-gray-200/80 bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-500">Stok tercatat saat ini</p>
                <p
                  className={`mt-1 inline-flex rounded-md px-2 text-2xl font-semibold ${stockCellClass(selection.qty)}`}
                >
                  {formatQty(selection.qty)}
                </p>
              </div>
              <div>
                <label htmlFor="store-stock-qty" className="mb-1 block text-xs text-gray-500">
                  Stok fisik sebenarnya (absolut)
                </label>
                <Input
                  id="store-stock-qty"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={qtyInput}
                  onChange={(event) => setQtyInput(event.target.value)}
                  aria-invalid={invalidQty}
                  className="h-10 text-right text-base"
                />
                {invalidQty ? (
                  <p className="mt-1 text-xs text-red-600">Isi bilangan bulat 0 atau lebih.</p>
                ) : parsedQty !== null && diff !== 0 ? (
                  <p className={`mt-1 text-xs ${diff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Selisih {formatQtyChange(diff)} unit
                  </p>
                ) : null}
              </div>
            </div>
            <div>
              <label htmlFor="store-stock-note" className="mb-1 block text-xs text-gray-500">
                Catatan (opsional)
              </label>
              <Textarea
                id="store-stock-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Contoh: hasil stock opname mingguan"
                rows={2}
              />
            </div>
          </TabsContent>

          <TabsContent value="kartu" className="pt-2">
            {movementsQuery.isLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
                <Loader2 className="h-5 w-5 animate-spin text-pink-500" />
                Memuat kartu stok...
              </div>
            ) : movementsQuery.error ? (
              <p className="py-6 text-center text-sm text-red-600">
                {movementsQuery.error instanceof Error
                  ? movementsQuery.error.message
                  : 'Gagal memuat kartu stok'}
              </p>
            ) : (movementsQuery.data ?? []).length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-400">
                Belum ada mutasi stok di lokasi ini.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Tanggal</th>
                      <th className="px-3 py-2 text-left font-semibold">Jenis</th>
                      <th className="px-3 py-2 text-right font-semibold">Perubahan</th>
                      <th className="px-3 py-2 text-right font-semibold">Stok akhir</th>
                      <th className="px-3 py-2 text-left font-semibold">Referensi</th>
                      <th className="px-3 py-2 text-left font-semibold">Oleh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(movementsQuery.data ?? []).map((movement) => (
                      <tr key={movement.id}>
                        <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                          {formatDateTime(movement.created_at)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                          {movementTypeLabel(movement.movement_type)}
                        </td>
                        <td
                          className={`whitespace-nowrap px-3 py-2 text-right font-medium ${
                            movement.qty_change > 0
                              ? 'text-green-600'
                              : movement.qty_change < 0
                                ? 'text-red-600'
                                : 'text-gray-500'
                          }`}
                        >
                          {formatQtyChange(movement.qty_change)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-gray-900">
                          {formatQty(movement.qty_after)}
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          <span className="block whitespace-nowrap">{movement.reference_no || '-'}</span>
                          {movement.note ? (
                            <span className="block text-xs text-gray-400">{movement.note}</span>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                          {movement.created_by_name || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogPanelBody>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={setStockMutation.isPending}>
          Tutup
        </Button>
        {tab === 'koreksi' ? (
          <Button
            type="button"
            onClick={handleSave}
            disabled={parsedQty === null || unchanged || setStockMutation.isPending}
            className="purchasing-main-button"
          >
            {setStockMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Simpan
          </Button>
        ) : null}
      </DialogFooter>
    </>
  );
}
