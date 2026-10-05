'use client';

// EPIC-039 Fase E — back-office pesanan toko online: pipeline status,
// detail order, buat pengiriman (Biteship) / input resi manual, batalkan
// (refund manual via dashboard Xendit — keputusan owner).
// EPIC-054 — pesanan website toko: konfirmasi transfer manual (lihat bukti),
// ambil di toko (Disiapkan → Sudah diambil), ongkir flat (input resi manual).

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ImageIcon, Loader2, Package, RefreshCw, Search, Store, Truck, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogPanel,
  DialogPanelHeader,
  DialogPanelTitle,
  DialogPanelDescription,
  DialogPanelBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { PurchasingPageHeader } from '@/modules/purchasing/components/page/purchasing-page-header';
import { PurchasingListSection } from '@/modules/purchasing/components/list/PurchasingListSection';
import { formatAmount } from '@/lib/purchasing/utils';

type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  shipping_area_label: string | null;
  courier_code: string | null;
  courier_service: string | null;
  total: string;
  waybill: string | null;
  item_count: string;
  customer_id: string | null;
  created_at: string;
  source_channel: string | null;
  payment_method: string | null;
  shipping_method: string | null;
  payment_due_at: string | null;
  has_payment_proof: boolean | null;
  pickup_point_name: string | null;
};

type OrderDetail = OrderRow & {
  shipping_address: string;
  shipping_postal_code: string | null;
  subtotal: string;
  shipping_cost: string;
  notes: string | null;
  shipment_provider: string | null;
  shipment_status: string | null;
  provider_order_id: string | null;
  pickup_point_address: string | null;
  destination_province: string | null;
  destination_city: string | null;
  payment_confirmed_at: string | null;
  payment_confirmed_by_name: string | null;
  items: Array<{
    product_name: string;
    sku_name: string | null;
    sku_code: string | null;
    quantity: string;
    unit_price: string;
    total: string;
  }>;
};

const STATUS_TABS = [
  { value: '', label: 'Semua' },
  { value: 'pending', label: 'Menunggu Bayar' },
  { value: 'paid', label: 'Dibayar' },
  { value: 'packing', label: 'Dikemas' },
  { value: 'shipped', label: 'Dikirim' },
  { value: 'completed', label: 'Selesai' },
  { value: 'cancelled', label: 'Batal' },
];

const STATUS_TONE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  paid: 'bg-green-50 text-green-700',
  packing: 'bg-blue-50 text-blue-700',
  shipped: 'bg-indigo-50 text-indigo-700',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-50 text-red-600',
  refund: 'bg-gray-100 text-gray-600',
};

const PAYMENT_LABEL: Record<string, string> = {
  manual_transfer: 'Transfer manual',
  xendit: 'Online (Xendit)',
};

const SHIPPING_LABEL: Record<string, string> = {
  pickup: 'Ambil di toko',
  flat: 'Ongkir flat',
  courier: 'Kurir',
};

/** Status yang dibaca admin — pesanan ambil di toko memakai istilahnya sendiri. */
function statusLabel(order: Pick<OrderRow, 'status' | 'shipping_method' | 'payment_method' | 'has_payment_proof'>) {
  const pickup = order.shipping_method === 'pickup';
  if (order.status === 'pending' && order.payment_method === 'manual_transfer') {
    return order.has_payment_proof ? 'Cek bukti transfer' : 'Menunggu transfer';
  }
  if (pickup && order.status === 'packing') return 'Disiapkan';
  if (pickup && order.status === 'completed') return 'Sudah diambil';
  return STATUS_TABS.find((tab) => tab.value === order.status)?.label ?? order.status;
}

async function parseJson<T>(response: Response, fallback: string): Promise<T> {
  const json = await response.json();
  if (!response.ok || json.success === false) {
    throw new Error(json.error || fallback);
  }
  return json as T;
}

export function ShopOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [manualWaybill, setManualWaybill] = useState('');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());
      const response = await fetch(`/api/shop/orders?${params.toString()}`, { cache: 'no-store' });
      const json = await parseJson<{ data: OrderRow[] }>(response, 'Gagal memuat pesanan');
      setOrders(json.data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memuat pesanan');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const openDetail = async (orderId: string) => {
    setDetailLoading(true);
    setManualWaybill('');
    try {
      const response = await fetch(`/api/shop/orders/${orderId}`, { cache: 'no-store' });
      const json = await parseJson<{ data: OrderDetail }>(response, 'Gagal memuat detail');
      setDetail(json.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memuat detail');
    } finally {
      setDetailLoading(false);
    }
  };

  const runAction = async (fn: () => Promise<void>, successMessage: string) => {
    if (acting) return;
    setActing(true);
    try {
      await fn();
      toast.success(successMessage);
      setDetail(null);
      await loadOrders();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Aksi gagal');
    } finally {
      setActing(false);
    }
  };

  const transition = (status: string, note?: string) => async () => {
    if (!detail) return;
    const response = await fetch(`/api/shop/orders/${detail.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, note }),
    });
    await parseJson(response, 'Gagal mengubah status');
  };

  const confirmPayment = async () => {
    if (!detail) return;
    const response = await fetch(`/api/shop/orders/${detail.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm_payment' }),
    });
    await parseJson(response, 'Gagal konfirmasi pembayaran');
  };

  const createProviderShipment = async () => {
    if (!detail) return;
    const response = await fetch(`/api/shop/orders/${detail.id}/shipment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'provider' }),
    });
    await parseJson(response, 'Gagal membuat pengiriman');
  };

  const submitManualWaybill = async () => {
    if (!detail) return;
    if (manualWaybill.trim().length < 6) {
      throw new Error('Nomor resi minimal 6 karakter');
    }
    const response = await fetch(`/api/shop/orders/${detail.id}/shipment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'manual', waybill: manualWaybill.trim() }),
    });
    await parseJson(response, 'Gagal menyimpan resi');
  };

  return (
    <div className="space-y-6">
      <PurchasingPageHeader
        title="Pesanan Toko Online"
        description="Pipeline pesanan storefront: bayar → kemas → kirim (resi) → selesai."
      />

      <PurchasingListSection
        icon={Package}
        title="Daftar Pesanan"
        description={`${orders.length} pesanan`}
        toolbar={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative min-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Cari nomor/nama/WA..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-9 pl-9"
              />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={loadOrders} className="h-9">
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Muat Ulang
            </Button>
          </div>
        }
      >
        <div className="border-b border-gray-100 px-5 py-3">
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map((tab) => (
              <Button
                key={tab.value}
                type="button"
                size="sm"
                variant={statusFilter === tab.value ? 'default' : 'outline'}
                className="h-8"
                onClick={() => setStatusFilter(tab.value)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-3 px-4 py-16 text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
            <p className="text-sm">Memuat pesanan...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-16 text-gray-400">
            <Package className="h-12 w-12 opacity-40" />
            <p className="text-sm">Belum ada pesanan</p>
          </div>
        ) : (
          <div className="overflow-x-auto px-4">
            <table className="min-w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Order</th>
                  <th className="px-4 py-3 text-left font-semibold">Pembeli</th>
                  <th className="px-4 py-3 text-left font-semibold">Tujuan</th>
                  <th className="px-4 py-3 text-left font-semibold">Kurir / Resi</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => openDetail(order.id)}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{order.order_number}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(order.created_at).toLocaleString('id-ID')}
                      </p>
                      {order.payment_method || order.source_channel === 'web' ? (
                        <p className="mt-1 flex flex-wrap gap-1 text-[10px] font-semibold uppercase">
                          {order.source_channel === 'web' ? (
                            <span className="rounded bg-pink-50 px-1.5 py-0.5 text-pink-600">Website</span>
                          ) : null}
                          {order.payment_method ? (
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">
                              {PAYMENT_LABEL[order.payment_method] ?? order.payment_method}
                            </span>
                          ) : null}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900">
                        {order.customer_name}
                        {order.customer_id ? (
                          <span className="ml-1.5 rounded bg-pink-50 px-1.5 py-0.5 text-[10px] font-semibold text-pink-600">
                            MEMBER
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-gray-400">{order.customer_phone}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {order.shipping_method === 'pickup'
                        ? order.pickup_point_name || 'Ambil di toko'
                        : order.shipping_area_label || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">
                        {order.shipping_method === 'pickup' || order.shipping_method === 'flat'
                          ? SHIPPING_LABEL[order.shipping_method]
                          : [order.courier_code, order.courier_service].filter(Boolean).join(' ') || '—'}
                      </p>
                      {order.waybill ? (
                        <p className="text-xs font-medium text-indigo-600">{order.waybill}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {formatAmount(Number(order.total))}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_TONE[order.status] || 'bg-gray-100 text-gray-600'}`}
                      >
                        {statusLabel(order)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PurchasingListSection>

      {/* Detail */}
      <Dialog open={detail !== null || detailLoading} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogPanel size="lg">
          <DialogPanelHeader>
            <DialogPanelTitle>{detail?.order_number || 'Memuat...'}</DialogPanelTitle>
            <DialogPanelDescription>
              {detail
                ? `${detail.customer_name} — ${detail.customer_phone}`
                : ''}
            </DialogPanelDescription>
          </DialogPanelHeader>
          <DialogPanelBody className="max-h-[65vh] space-y-4 overflow-y-auto">
            {detailLoading || !detail ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-pink-500" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_TONE[detail.status] || 'bg-gray-100 text-gray-600'}`}
                  >
                    {statusLabel(detail)}
                  </span>
                  {detail.payment_method ? (
                    <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                      {PAYMENT_LABEL[detail.payment_method] ?? detail.payment_method}
                    </span>
                  ) : null}
                  {detail.waybill ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                      <Truck className="h-3 w-3" />
                      {detail.waybill}
                    </span>
                  ) : null}
                </div>

                {detail.shipping_method === 'pickup' ? (
                  <div className="rounded-lg border border-pink-100 bg-pink-50/50 p-3 text-sm">
                    <p className="flex items-center gap-1.5 font-medium text-gray-900">
                      <Store className="h-4 w-4 text-pink-600" />
                      Ambil di {detail.pickup_point_name || 'toko'}
                    </p>
                    {detail.pickup_point_address ? (
                      <p className="text-gray-600">{detail.pickup_point_address}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-gray-500">
                      Stok dipotong dari toko ini. Serahkan barang setelah pembeli menunjukkan nomor pesanan.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-3 text-sm">
                    <p className="font-medium text-gray-900">{detail.customer_name}</p>
                    <p className="text-gray-600">{detail.shipping_address}</p>
                    <p className="text-gray-500">
                      {detail.shipping_area_label}
                      {detail.shipping_postal_code ? ` (${detail.shipping_postal_code})` : ''}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Pengiriman:{' '}
                      {detail.shipping_method === 'flat'
                        ? 'Ongkir flat — kirim dari Gudang Pusat, input resi manual'
                        : [detail.courier_code, detail.courier_service].filter(Boolean).join(' ') || '—'}
                    </p>
                  </div>
                )}

                {detail.payment_method === 'manual_transfer' ? (
                  <div className="rounded-lg border border-gray-200 p-3 text-sm">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                      Transfer manual
                    </p>
                    {detail.payment_confirmed_at ? (
                      <p className="flex items-center gap-1.5 text-green-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Dikonfirmasi {new Date(detail.payment_confirmed_at).toLocaleString('id-ID')}
                        {detail.payment_confirmed_by_name ? ` oleh ${detail.payment_confirmed_by_name}` : ''}
                      </p>
                    ) : detail.status === 'pending' ? (
                      <p className="text-gray-600">
                        Batas bayar:{' '}
                        {detail.payment_due_at
                          ? new Date(detail.payment_due_at).toLocaleString('id-ID')
                          : '—'}
                        . Cocokkan mutasi rekening sebesar{' '}
                        <strong>{formatAmount(Number(detail.total))}</strong> sebelum konfirmasi.
                      </p>
                    ) : null}
                    {detail.has_payment_proof ? (
                      <a
                        href={`/api/shop/orders/${detail.id}/payment-proof`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-pink-600 hover:underline"
                      >
                        <ImageIcon className="h-4 w-4" />
                        Lihat bukti transfer
                      </a>
                    ) : detail.status === 'pending' ? (
                      <p className="mt-1 text-xs text-gray-400">Pembeli belum mengunggah bukti transfer.</p>
                    ) : null}
                  </div>
                ) : null}

                <div className="space-y-1.5">
                  {detail.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">
                        {item.product_name}
                        {item.sku_name ? ` — ${item.sku_name}` : ''}{' '}
                        <span className="text-gray-400">× {Number(item.quantity)}</span>
                      </span>
                      <span className="text-gray-900">{formatAmount(Number(item.total))}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-sm">
                    <span className="text-gray-500">Ongkir</span>
                    <span className="text-gray-900">{formatAmount(Number(detail.shipping_cost))}</span>
                  </div>
                  <div className="flex items-center justify-between text-base font-semibold">
                    <span>Total</span>
                    <span className="text-pink-600">{formatAmount(Number(detail.total))}</span>
                  </div>
                </div>

                {detail.notes ? (
                  <p className="whitespace-pre-line rounded-lg bg-amber-50/70 px-3 py-2 text-xs text-amber-800">
                    {detail.notes}
                  </p>
                ) : null}

                {/* Input resi manual utk order siap kirim tanpa pengiriman aktif */}
                {['paid', 'packing'].includes(detail.status) &&
                !detail.provider_order_id &&
                detail.shipping_method !== 'pickup' ? (
                  <div className="rounded-lg border border-gray-200 p-3">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                      Input resi manual
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={manualWaybill}
                        placeholder="Nomor resi kurir"
                        onChange={(event) => setManualWaybill(event.target.value)}
                      />
                      <Button
                        type="button"
                        disabled={acting}
                        onClick={() =>
                          runAction(submitManualWaybill, 'Resi tersimpan — pesanan dikirim')
                        }
                      >
                        Simpan
                      </Button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </DialogPanelBody>
          <DialogFooter>
            {detail ? (
              <div className="flex w-full flex-wrap items-center justify-end gap-2">
                {['pending', 'paid', 'packing'].includes(detail.status) ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={acting}
                    className="border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => {
                      const manual = detail.payment_method === 'manual_transfer';
                      const refundNote = detail.status === 'pending'
                        ? ''
                        : manual
                          ? ' Uang yang sudah ditransfer dikembalikan MANUAL ke rekening pembeli.'
                          : ' Refund uang dilakukan MANUAL via dashboard Xendit.';
                      if (!window.confirm(`Batalkan pesanan ini? Stok akan dikembalikan.${refundNote}`)) return;
                      runAction(
                        transition(
                          'cancelled',
                          manual
                            ? 'Dibatalkan back-office — refund manual ke rekening pembeli'
                            : 'Dibatalkan back-office — refund manual via Xendit'
                        ),
                        'Pesanan dibatalkan — stok dikembalikan'
                      );
                    }}
                  >
                    <X className="mr-1.5 h-3.5 w-3.5" />
                    Batalkan
                  </Button>
                ) : null}
                {detail.status === 'pending' && detail.payment_method === 'manual_transfer' ? (
                  <Button
                    type="button"
                    disabled={acting}
                    className="purchasing-main-button"
                    onClick={() => {
                      if (!window.confirm(`Dana ${formatAmount(Number(detail.total))} sudah masuk ke rekening? Pesanan akan ditandai dibayar.`)) return;
                      runAction(confirmPayment, 'Transfer dikonfirmasi — pesanan dibayar');
                    }}
                  >
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    Konfirmasi Transfer
                  </Button>
                ) : null}
                {detail.status === 'paid' ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={acting}
                    onClick={() =>
                      runAction(
                        transition('packing'),
                        detail.shipping_method === 'pickup' ? 'Pesanan ditandai disiapkan' : 'Pesanan ditandai dikemas'
                      )
                    }
                  >
                    {detail.shipping_method === 'pickup' ? 'Tandai Disiapkan' : 'Tandai Dikemas'}
                  </Button>
                ) : null}
                {detail.shipping_method === 'pickup' && ['paid', 'packing'].includes(detail.status) ? (
                  <Button
                    type="button"
                    disabled={acting}
                    className="purchasing-main-button"
                    onClick={() => runAction(transition('completed', 'Diambil pembeli di toko'), 'Pesanan sudah diambil')}
                  >
                    <Store className="mr-1.5 h-4 w-4" />
                    Sudah Diambil
                  </Button>
                ) : null}
                {['paid', 'packing'].includes(detail.status) &&
                !detail.provider_order_id &&
                detail.shipping_method !== 'pickup' &&
                detail.shipping_method !== 'flat' ? (
                  <Button
                    type="button"
                    disabled={acting}
                    className="purchasing-main-button"
                    onClick={() =>
                      runAction(createProviderShipment, 'Pengiriman dibuat — menunggu resi kurir')
                    }
                  >
                    <Truck className="mr-1.5 h-4 w-4" />
                    Buat Pengiriman (Provider)
                  </Button>
                ) : null}
                {detail.status === 'shipped' ? (
                  <Button
                    type="button"
                    disabled={acting}
                    className="purchasing-main-button"
                    onClick={() => runAction(transition('completed'), 'Pesanan selesai')}
                  >
                    Tandai Selesai
                  </Button>
                ) : null}
              </div>
            ) : null}
          </DialogFooter>
        </DialogPanel>
      </Dialog>
    </div>
  );
}
