"use client";

import { useMemo, useState } from 'react';
import { Merge, AlertTriangle, User, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { mergeOrders } from '@/lib/pos-api';
import type { Order } from '@/lib/pos-api';

interface MergeTableModalProps {
  open: boolean;
  order: Order | null;
  allOrders: Order[];
  onClose: () => void;
  onSuccess?: () => void;
}

export function MergeTableModal({ open, order, allOrders, onClose, onSuccess }: MergeTableModalProps) {
  const [targetOrderId, setTargetOrderId] = useState<string>('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const eligibleTargets = useMemo(() => {
    if (!order) return [];
    return allOrders.filter(
      (o) =>
        o.id !== order.id &&
        o.id !== order.merged_to_order_id &&
        !['completed', 'cancelled', 'voided', 'merged'].includes(o.status || '')
    );
  }, [allOrders, order]);

  const selectedTarget = useMemo(
    () => eligibleTargets.find((o) => o.id === targetOrderId),
    [eligibleTargets, targetOrderId]
  );

  const reset = () => {
    setTargetOrderId('');
    setPin('');
    setError('');
    setBusy(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!order || !targetOrderId || !pin.trim()) return;
    try {
      setBusy(true);
      setError('');
      const res = await mergeOrders(order.id, targetOrderId, pin.trim());
      if (res.success) {
        reset();
        onSuccess?.();
        onClose();
      } else {
        setError(res.error || 'Gagal menggabungkan order');
      }
    } catch (e: any) {
      setError(e.message || 'Terjadi kesalahan');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-pink-600">
            <Merge className="w-5 h-5" /> Gabung Order
          </DialogTitle>
        </DialogHeader>

        {order && (
          <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
            <p>
              <span className="font-medium">Order Asal:</span> {order.order_number} —{' '}
              {order.table_id || order.order_type}
            </p>
            <p className="text-xs text-gray-500">
              Semua item dari order asal akan dipindahkan ke order tujuan. Order asal akan otomatis di-merge.
            </p>
          </div>
        )}

        <div className="space-y-3 mt-2">
          {/* Target Order */}
          <div>
            <label className="text-sm font-medium text-gray-700">Pilih Order Tujuan</label>
            {eligibleTargets.length === 0 ? (
              <div className="bg-amber-50 text-amber-700 text-sm px-3 py-2 rounded-lg mt-1">
                Tidak ada order aktif yang bisa digabung.
              </div>
            ) : (
              <div className="mt-1 max-h-60 overflow-y-auto border border-gray-200 rounded-lg divide-y">
                {eligibleTargets.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setTargetOrderId(o.id)}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors ${
                      targetOrderId === o.id ? 'bg-pink-50 border-l-4 border-pink-600' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{o.order_number}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Table2 className="w-3 h-3" />
                          {o.table_id || o.order_type}
                        </span>
                        <span>• {o.items?.length || 0} item</span>
                        <span>• Rp {(o.total_amount || 0).toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                    {targetOrderId === o.id && (
                      <div className="w-4 h-4 rounded-full bg-pink-600 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                          <path d="M5 12l5 5L20 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Supervisor PIN */}
          {eligibleTargets.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700">PIN Supervisor</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Masukkan 4-6 digit PIN"
                className="w-full mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 tracking-widest"
              />
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {error}
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <Button variant="outline" className="flex-1" onClick={handleClose} disabled={busy}>
            Batal
          </Button>
          <Button
            className="flex-1 bg-pink-600 hover:bg-pink-700"
            onClick={handleSubmit}
            disabled={busy || !targetOrderId || !pin.trim()}
          >
            {busy ? 'Menggabung...' : 'Gabung Order'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
