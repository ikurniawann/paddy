'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowRight, ArrowRightLeft, Eye, Loader2, Plus, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PurchasingPageHeader } from '@/modules/purchasing/components/page/purchasing-page-header';
import { PurchasingListSection } from '@/modules/purchasing/components/list/PurchasingListSection';
import { useStoreStock } from '@/features/pos/store-stock/queries';
import { formatDateTime, formatQty } from '@/features/pos/store-stock/helpers';
import { useStockTransfers } from '../queries';
import { TRANSFER_STATUS_TABS, transferStatusBadgeClass, transferStatusLabel } from '../helpers';
import { NewTransferDialog } from './new-transfer-dialog';
import { TransferDetailDialog } from './transfer-detail-dialog';

export function StockTransfersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [createOpen, setCreateOpen] = useState(() => searchParams.get('new') === '1');
  const [detailId, setDetailId] = useState<string | null>(null);

  // `?new=1` (dari halaman Stok per Toko) membuka form sekali, lalu param dibuang
  // supaya refresh / tutup dialog tidak membukanya lagi.
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      router.replace(pathname, { scroll: false });
    }
  }, [searchParams, router, pathname]);

  const locationsQuery = useStoreStock('');
  const locations = locationsQuery.data?.locations ?? [];
  const { data: transfers = [], isLoading, isFetching, error } = useStockTransfers({ status, warehouseId });
  const errorMessage = error instanceof Error ? error.message : null;

  return (
    <div className="space-y-6">
      <PurchasingPageHeader
        title="Transfer Stok Toko"
        description="Kirim stok produk multi-toko dari Gudang Pusat ke toko, atau antar toko. Stok asal berkurang saat dikirim dan stok tujuan bertambah saat diterima."
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/pos/store-stock')}
              className="h-9 gap-2"
            >
              <Store className="h-4 w-4" />
              Stok per Toko
            </Button>
            <Button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="purchasing-main-button h-9 gap-2"
            >
              <Plus className="h-4 w-4" />
              Transfer Baru
            </Button>
          </>
        }
      />

      <PurchasingListSection
        icon={ArrowRightLeft}
        title="Daftar Transfer"
        description={`${transfers.length} transfer ditampilkan`}
        toolbar={
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <select
              value={warehouseId}
              onChange={(event) => setWarehouseId(event.target.value)}
              aria-label="Filter lokasi"
              className="h-9 w-full rounded-lg border border-gray-200/80 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-pink-300 focus:ring-1 focus:ring-pink-100 sm:w-56"
            >
              <option value="">Semua lokasi</option>
              {locations.map((location) => (
                <option key={location.warehouse_id} value={location.warehouse_id}>
                  {location.warehouse_name}
                </option>
              ))}
            </select>
            {isFetching && !isLoading ? <Loader2 className="h-4 w-4 animate-spin text-gray-400" /> : null}
          </div>
        }
      >
        <div className="border-b border-gray-100 px-5 py-3">
          <div className="flex flex-wrap gap-2">
            {TRANSFER_STATUS_TABS.map((tab) => (
              <Button
                key={tab.value || 'all'}
                type="button"
                variant={status === tab.value ? 'default' : 'outline'}
                size="sm"
                className="h-8"
                onClick={() => setStatus(tab.value)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
            <p className="text-sm">Memuat transfer stok...</p>
          </div>
        ) : errorMessage ? (
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-red-600">
            <AlertTriangle className="h-10 w-10 opacity-60" />
            <p className="text-sm">{errorMessage}</p>
          </div>
        ) : transfers.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-gray-400">
            <ArrowRightLeft className="h-12 w-12 opacity-40" />
            <p className="text-sm">Belum ada transfer stok</p>
          </div>
        ) : (
          <div className="overflow-x-auto px-4">
            <table className="min-w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">No. Transfer</th>
                  <th className="px-4 py-3 text-left font-semibold">Dari → Ke</th>
                  <th className="px-4 py-3 text-right font-semibold">Item / Qty</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Dibuat</th>
                  <th className="px-4 py-3 text-center font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transfers.map((transfer) => (
                  <tr
                    key={transfer.id}
                    onClick={() => setDetailId(transfer.id)}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                      {transfer.transfer_no}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <span className="inline-flex flex-wrap items-center gap-1.5">
                        <span className="whitespace-nowrap">{transfer.from_name}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
                        <span className="whitespace-nowrap">{transfer.to_name}</span>
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-gray-700">
                      {formatQty(transfer.item_count)} item · {formatQty(transfer.total_qty)} unit
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${transferStatusBadgeClass(transfer.status)}`}
                      >
                        {transferStatusLabel(transfer.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="whitespace-nowrap text-gray-700">{formatDateTime(transfer.created_at)}</p>
                      <p className="text-xs text-gray-400">{transfer.created_by_name || '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1"
                        onClick={(event) => {
                          event.stopPropagation();
                          setDetailId(transfer.id);
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Detail
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PurchasingListSection>

      <NewTransferDialog
        open={createOpen}
        locations={locations}
        locationsLoading={locationsQuery.isLoading}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => {
          setCreateOpen(false);
          setDetailId(id);
        }}
      />
      <TransferDetailDialog transferId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}
