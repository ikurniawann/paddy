'use client';

import { useState } from 'react';
import { AlertTriangle, ArrowRight, Ban, Loader2, PackageCheck, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogFooter,
  DialogPanel,
  DialogPanelBody,
  DialogPanelDescription,
  DialogPanelHeader,
  DialogPanelTitle,
} from '@/components/ui/dialog';
import { allowedTransferActions } from '@/lib/pos/store-stock';
import { formatDateTime, formatQty } from '@/features/pos/store-stock/helpers';
import { useStockTransferAction } from '../mutations';
import { useStockTransfer } from '../queries';
import {
  TRANSFER_ACTION_LABEL,
  TRANSFER_ACTION_SUCCESS,
  transferStatusBadgeClass,
  transferStatusLabel,
} from '../helpers';
import type { StockTransferAction } from '../types';

const ACTION_ICON: Record<StockTransferAction, typeof Send> = {
  send: Send,
  receive: PackageCheck,
  cancel: Ban,
};

export function TransferDetailDialog({
  transferId,
  onClose,
}: {
  transferId: string | null;
  onClose: () => void;
}) {
  const { data: transfer, isLoading, error } = useStockTransfer(transferId);
  const actionMutation = useStockTransferAction();
  const [confirmCancel, setConfirmCancel] = useState(false);

  const runAction = (action: StockTransferAction) => {
    if (!transferId) return;
    actionMutation.mutate(
      { id: transferId, action },
      {
        onSuccess: () => {
          toast.success(TRANSFER_ACTION_SUCCESS[action]);
          setConfirmCancel(false);
        },
        onError: (mutationError) => {
          toast.error(mutationError instanceof Error ? mutationError.message : 'Gagal memproses transfer');
        },
      }
    );
  };

  const actions = transfer ? allowedTransferActions(transfer.status) : [];
  const insufficientAtSource =
    transfer?.status === 'draft' && transfer.items.some((item) => item.qty > item.stock_at_source);
  const pendingAction = actionMutation.isPending ? actionMutation.variables?.action : null;

  return (
    <>
      <Dialog open={transferId !== null} onOpenChange={(open) => !open && onClose()}>
        <DialogPanel size="lg">
          <DialogPanelHeader>
            <DialogPanelTitle className="flex flex-wrap items-center gap-2">
              {transfer?.transfer_no ?? 'Detail transfer'}
              {transfer ? (
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${transferStatusBadgeClass(transfer.status)}`}
                >
                  {transferStatusLabel(transfer.status)}
                </span>
              ) : null}
            </DialogPanelTitle>
            {transfer ? (
              <DialogPanelDescription className="flex flex-wrap items-center gap-1.5">
                <span className="font-medium text-gray-700">{transfer.from_name}</span>
                <ArrowRight className="h-3.5 w-3.5" />
                <span className="font-medium text-gray-700">{transfer.to_name}</span>
              </DialogPanelDescription>
            ) : null}
          </DialogPanelHeader>
          <DialogPanelBody className="max-h-[65vh] space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-400">
                <Loader2 className="h-5 w-5 animate-spin text-pink-500" />
                Memuat detail transfer...
              </div>
            ) : error ? (
              <p className="py-8 text-center text-sm text-red-600">
                {error instanceof Error ? error.message : 'Gagal memuat detail transfer'}
              </p>
            ) : transfer ? (
              <>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
                  <div>
                    <dt className="text-gray-500">Dibuat</dt>
                    <dd className="text-gray-900">{formatDateTime(transfer.created_at)}</dd>
                    <dd className="text-gray-500">{transfer.created_by_name || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Dikirim</dt>
                    <dd className="text-gray-900">{formatDateTime(transfer.sent_at)}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Diterima</dt>
                    <dd className="text-gray-900">{formatDateTime(transfer.received_at)}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Dibatalkan</dt>
                    <dd className="text-gray-900">{formatDateTime(transfer.cancelled_at)}</dd>
                  </div>
                </dl>
                {transfer.notes ? (
                  <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">{transfer.notes}</p>
                ) : null}

                <div className="overflow-x-auto rounded-lg border border-gray-100">
                  <table className="min-w-full text-sm">
                    <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">Produk</th>
                        <th className="px-3 py-2 text-left font-semibold">Varian</th>
                        <th className="px-3 py-2 text-right font-semibold">Qty</th>
                        <th className="px-3 py-2 text-right font-semibold">Stok di asal</th>
                        <th className="px-3 py-2 text-right font-semibold">Stok di tujuan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {transfer.items.map((item) => {
                        const short = transfer.status === 'draft' && item.qty > item.stock_at_source;
                        return (
                          <tr key={item.id} className={short ? 'bg-red-50/50' : undefined}>
                            <td className="px-3 py-2 text-gray-900">{item.product_name}</td>
                            <td className="px-3 py-2">
                              <p className="text-gray-900">{item.sku_name || item.sku}</p>
                              <p className="text-xs text-gray-400">{item.sku}</p>
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums text-gray-900">
                              {formatQty(item.qty)}
                            </td>
                            <td
                              className={`whitespace-nowrap px-3 py-2 text-right tabular-nums ${short ? 'font-semibold text-red-600' : 'text-gray-600'}`}
                            >
                              {formatQty(item.stock_at_source)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-gray-600">
                              {formatQty(item.stock_at_destination)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {insufficientAtSource ? (
                  <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>Ada barang yang melebihi stok di {transfer.from_name}. Kirim akan ditolak.</span>
                  </div>
                ) : null}
              </>
            ) : null}
          </DialogPanelBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={actionMutation.isPending}>
              Tutup
            </Button>
            {actions.map((action) => {
              const Icon = ACTION_ICON[action];
              const isPending = pendingAction === action;
              return (
                <Button
                  key={action}
                  type="button"
                  variant={action === 'cancel' ? 'destructive' : 'default'}
                  disabled={actionMutation.isPending}
                  onClick={() => (action === 'cancel' ? setConfirmCancel(true) : runAction(action))}
                  className={`gap-2 ${action === 'cancel' ? '' : 'purchasing-main-button'}`}
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                  {TRANSFER_ACTION_LABEL[action]}
                </Button>
              );
            })}
          </DialogFooter>
        </DialogPanel>
      </Dialog>

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Batalkan transfer?"
        description={
          transfer?.status === 'sent'
            ? `Transfer ${transfer.transfer_no} sedang dalam pengiriman. Stok akan dikembalikan ke ${transfer.from_name}.`
            : `Transfer ${transfer?.transfer_no ?? ''} akan dibatalkan.`
        }
        confirmLabel="Batalkan transfer"
        cancelLabel="Kembali"
        loading={pendingAction === 'cancel'}
        onConfirm={() => runAction('cancel')}
      />
    </>
  );
}
