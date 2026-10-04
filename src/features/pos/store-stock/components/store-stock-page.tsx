'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { storeStockRoutesFor } from '@/lib/pos/store-stock';
import { AlertTriangle, ArrowRightLeft, Loader2, Search, Store, Warehouse, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PurchasingPageHeader } from '@/modules/purchasing/components/page/purchasing-page-header';
import { PurchasingListSection } from '@/modules/purchasing/components/list/PurchasingListSection';
import { PosProductThumbnail } from '@/components/pos/PosProductThumbnail';
import { useStoreStock } from '../queries';
import { formatQty, skuStockAt, stockCellClass, summarizeStoreStock } from '../helpers';
import type { StockCellSelection } from '../types';
import { StockCorrectionDialog } from './stock-correction-dialog';

export function StoreStockPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selection, setSelection] = useState<StockCellSelection | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearchTerm(searchQuery.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  const { data, isLoading, isFetching, error } = useStoreStock(searchTerm);
  const locations = useMemo(() => data?.locations ?? [], [data]);
  const manageable = useMemo(
    () => (data?.manageable_warehouse_ids ? new Set(data.manageable_warehouse_ids) : null),
    [data]
  );
  const products = useMemo(() => data?.products ?? [], [data]);
  const summary = useMemo(() => summarizeStoreStock(products, locations), [products, locations]);
  const errorMessage = error instanceof Error ? error.message : null;

  return (
    <div className="space-y-6">
      <PurchasingPageHeader
        title="Stok per Toko"
        description="Stok varian produk multi-toko (dijual di semua toko) di setiap lokasi: Gudang Pusat dan masing-masing toko. Klik angka stok untuk koreksi atau melihat kartu stok."
        actions={
          <Button
            type="button"
            onClick={() => router.push(`${storeStockRoutesFor(pathname).transfers}?new=1`)}
            className="purchasing-main-button h-9 gap-2"
          >
            <ArrowRightLeft className="h-4 w-4" />
            Transfer Stok
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {locations.map((location) => (
          <div
            key={location.warehouse_id}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
          >
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Warehouse className="h-3.5 w-3.5 shrink-0 text-pink-500" />
              <span className="truncate" title={location.warehouse_name}>
                {location.warehouse_name}
              </span>
            </div>
            <p className="mt-1 text-xl font-semibold text-gray-900">
              {formatQty(summary.totalsByLocation[location.warehouse_id] ?? 0)}
            </p>
            <p className="text-[11px] text-gray-400">unit</p>
          </div>
        ))}
        <div
          className={`rounded-xl border px-4 py-3 shadow-sm ${
            summary.skusWithEmptyStore > 0 ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'
          }`}
        >
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <AlertTriangle
              className={`h-3.5 w-3.5 shrink-0 ${summary.skusWithEmptyStore > 0 ? 'text-red-500' : 'text-gray-400'}`}
            />
            <span className="truncate">SKU kosong di salah satu toko</span>
          </div>
          <p
            className={`mt-1 text-xl font-semibold ${
              summary.skusWithEmptyStore > 0 ? 'text-red-700' : 'text-gray-900'
            }`}
          >
            {formatQty(summary.skusWithEmptyStore)}
          </p>
          <p className="text-[11px] text-gray-400">dari {formatQty(summary.skuCount)} varian</p>
        </div>
      </div>

      <PurchasingListSection
        icon={Store}
        title="Matriks Stok"
        description={`${products.length} produk · ${summary.skuCount} varian`}
        toolbar={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative min-w-[240px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Cari produk, SKU, atau barcode..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-9 pl-9"
              />
              {isFetching && !isLoading ? (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
              ) : null}
            </div>
            {searchQuery ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSearchTerm('');
                }}
                className="h-9 gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                Reset
              </Button>
            ) : null}
          </div>
        }
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
            <p className="text-sm">Memuat stok per toko...</p>
          </div>
        ) : errorMessage ? (
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-red-600">
            <AlertTriangle className="h-10 w-10 opacity-60" />
            <p className="text-sm">{errorMessage}</p>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-gray-400">
            <Store className="h-12 w-12 opacity-40" />
            <p className="text-sm">
              {searchTerm ? 'Tidak ada produk multi-toko yang cocok' : 'Belum ada produk multi-toko'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto px-4">
            <table className="min-w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="sticky left-0 z-10 min-w-[220px] bg-gray-50 px-4 py-3 text-left font-semibold">
                    Varian
                  </th>
                  {locations.map((location) => (
                    <th
                      key={location.warehouse_id}
                      className="min-w-[110px] whitespace-nowrap px-3 py-3 text-right font-semibold"
                      title={location.branch_name}
                    >
                      {location.warehouse_name}
                    </th>
                  ))}
                  <th className="min-w-[90px] px-4 py-3 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <Fragment key={product.product_id}>
                    <tr className="border-t border-gray-100 bg-gray-50/60">
                      <td className="sticky left-0 z-10 bg-gray-50 px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-gray-200/70">
                            <PosProductThumbnail src={product.image_url} alt={product.product_name} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900">{product.product_name}</p>
                            <p className="text-xs text-gray-400">
                              {product.category_name || 'Tanpa kategori'} · {product.product_sku}
                            </p>
                          </div>
                        </div>
                      </td>
                      {locations.map((location) => (
                        <td key={location.warehouse_id} className="px-3 py-2.5 text-right">
                          {product.home_warehouse_id === location.warehouse_id ? (
                            <span
                              className="inline-flex items-center rounded-full border border-pink-200 bg-pink-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-pink-700"
                              title="Lokasi asal (gudang induk) produk ini"
                            >
                              Pusat
                            </span>
                          ) : null}
                        </td>
                      ))}
                      <td className="px-4 py-2.5" />
                    </tr>
                    {product.skus.map((sku) => (
                      <tr key={sku.sku_id} className="border-t border-gray-100 hover:bg-gray-50/80">
                        <td className="sticky left-0 z-10 bg-white px-4 py-2 pl-[4.25rem]">
                          <p className={`text-gray-900 ${sku.is_active ? '' : 'line-through opacity-60'}`}>
                            {sku.sku_name || sku.sku}
                          </p>
                          <p className="text-xs text-gray-400">
                            {sku.sku}
                            {sku.is_active ? '' : ' · Nonaktif'}
                          </p>
                        </td>
                        {locations.map((location) => {
                          const qty = skuStockAt(sku, location.warehouse_id);
                          const isHome = product.home_warehouse_id === location.warehouse_id;
                          return (
                            <td
                              key={location.warehouse_id}
                              className={`px-1.5 py-1 text-right ${isHome ? 'bg-pink-50/40' : ''}`}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setSelection({
                                    productName: product.product_name,
                                    skuId: sku.sku_id,
                                    sku: sku.sku,
                                    skuName: sku.sku_name || sku.sku,
                                    warehouseId: location.warehouse_id,
                                    warehouseName: location.warehouse_name,
                                    qty,
                                    canEdit: !manageable || manageable.has(location.warehouse_id),
                                  })
                                }
                                title={
                                  !manageable || manageable.has(location.warehouse_id)
                                    ? `Koreksi stok ${sku.sku} di ${location.warehouse_name}`
                                    : `Kartu stok ${sku.sku} di ${location.warehouse_name}`
                                }
                                className={`w-full rounded-md px-2 py-1.5 text-right font-medium tabular-nums outline-none transition hover:ring-1 hover:ring-pink-200 focus-visible:ring-2 focus-visible:ring-pink-300 ${stockCellClass(qty)}`}
                              >
                                {formatQty(qty)}
                              </button>
                            </td>
                          );
                        })}
                        <td className="px-4 py-2 text-right font-semibold tabular-nums text-gray-900">
                          {formatQty(sku.stock_total)}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-red-100 ring-1 ring-red-200" /> Stok habis
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-100 ring-1 ring-amber-200" /> Stok ≤ 3
          </span>
          <span>Total = jumlah stok semua lokasi.</span>
        </div>
      </PurchasingListSection>

      <StockCorrectionDialog selection={selection} onClose={() => setSelection(null)} />
    </div>
  );
}
