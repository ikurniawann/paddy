"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Search, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { formatRupiah } from "@/lib/purchasing/utils";

const poItemSchema = z.object({
  description: z.string().min(1, "Deskripsi wajib diisi"),
  qty: z.coerce.number().min(1, "Minimal 1"),
  unit: z.string().min(1, "Satuan wajib diisi"),
  unit_price: z.coerce.number().min(0, "Harga tidak boleh negatif"),
  discount: z.coerce.number().min(0).default(0).optional(),
  notes: z.string().optional(),
});

const poSchema = z.object({
  pr_id: z.string().optional(),
  vendor_id: z.string().min(1, "Vendor wajib dipilih"),
  order_date: z.string().min(1, "Tanggal order wajib diisi"),
  delivery_date: z.string().optional(),
  payment_terms: z.string().optional(),
  delivery_address: z.string().min(1, "Alamat pengiriman wajib diisi"),
  discount_percent: z.coerce.number().min(0).max(100).default(0).optional(),
  tax_percent: z.coerce.number().min(0).max(100).default(11).optional(),
  shipping_cost: z.coerce.number().min(0).default(0).optional(),
  notes: z.string().optional(),
  items: z.array(poItemSchema).min(1, "Minimal 1 item"),
});

type POFormData = z.infer<typeof poSchema>;

interface POFormProps {
  vendors: { id: string; name: string }[];
  prData?: {
    id: string;
    pr_number: string;
    items: {
      description: string;
      qty: number;
      unit: string;
      estimated_price: number;
    }[];
  } | null;
  onSubmit: (data: POFormData) => void;
  isLoading?: boolean;
}

export function POForm({ vendors, prData, onSubmit, isLoading }: POFormProps) {
  const [calculations, setCalculations] = useState({
    subtotal: 0,
    discountAmount: 0,
    taxAmount: 0,
    total: 0,
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<POFormData>({
    resolver: zodResolver(poSchema),
    defaultValues: {
      pr_id: prData?.id,
      order_date: new Date().toISOString().split("T")[0],
      tax_percent: 11,
      discount_percent: 0,
      shipping_cost: 0,
      delivery_address: "Jl. Raya No. 123, Jakarta", // Default company address
      items: prData
        ? prData.items.map((item) => ({
            description: item.description,
            qty: item.qty,
            unit: item.unit,
            unit_price: item.estimated_price,
            discount: 0,
            notes: "",
          }))
        : [{ description: "", qty: 1, unit: "", unit_price: 0, discount: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const items = watch("items");
  const discountPercent = watch("discount_percent");
  const taxPercent = watch("tax_percent");
  const shippingCost = watch("shipping_cost");

  // Calculate totals
  useEffect(() => {
    const subtotal = items.reduce(
      (sum, item) =>
        sum +
        (item.qty || 0) * (item.unit_price || 0) -
        (item.discount || 0),
      0
    );

    const discountAmount = (subtotal * (discountPercent || 0)) / 100;
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = (afterDiscount * (taxPercent || 0)) / 100;
    const total = afterDiscount + taxAmount + (shippingCost || 0);

    setCalculations({
      subtotal,
      discountAmount,
      taxAmount,
      total,
    });
  }, [items, discountPercent, taxPercent, shippingCost]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          {/* PR Reference */}
          {prData && (
            <div>
              <Label>Berdasarkan PR</Label>
              <Input value={prData.pr_number} disabled className="bg-gray-50" />
              <input type="hidden" {...register("pr_id")} />
            </div>
          )}

          {/* Vendor */}
          <div>
            <Label htmlFor="vendor_id">Vendor *</Label>
            <Select
              onValueChange={(value) => setValue("vendor_id", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih vendor" />
              </SelectTrigger>
              <SelectContent>
                {vendors.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.vendor_id && (
              <p className="text-sm text-red-500">{errors.vendor_id.message}</p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="order_date">Tanggal Order *</Label>
              <Input type="date" {...register("order_date")} />
            </div>
            <div>
              <Label htmlFor="delivery_date">Tanggal Pengiriman</Label>
              <Input type="date" {...register("delivery_date")} />
            </div>
          </div>

          {/* Payment Terms */}
          <div>
            <Label htmlFor="payment_terms">Ketentuan Pembayaran</Label>
            <Select
              onValueChange={(value) => setValue("payment_terms", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih ketentuan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cod">COD (Cash on Delivery)</SelectItem>
                <SelectItem value="net_7">Net 7 Hari</SelectItem>
                <SelectItem value="net_14">Net 14 Hari</SelectItem>
                <SelectItem value="net_30">Net 30 Hari</SelectItem>
                <SelectItem value="dp_50">DP 50%</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          {/* Delivery Address */}
          <div>
            <Label htmlFor="delivery_address">Alamat Pengiriman *</Label>
            <Textarea
              {...register("delivery_address")}
              rows={4}
              placeholder="Alamat lengkap pengiriman..."
            />
            {errors.delivery_address && (
              <p className="text-sm text-red-500">
                {errors.delivery_address.message}
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Catatan PO</Label>
            <Textarea
              {...register("notes")}
              rows={3}
              placeholder="Catatan untuk vendor..."
            />
          </div>
        </div>
      </div>

      {/* Items */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <Label>Item Purchase Order *</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              append({
                description: "",
                qty: 1,
                unit: "",
                unit_price: 0,
                discount: 0,
                notes: "",
              })
            }
          >
            <Plus className="w-4 h-4 mr-1" /> Tambah Item
          </Button>
        </div>

        <div className="space-y-3">
          {fields.map((field, index) => (
            <Card key={field.id}>
              <CardContent className="p-4">
                <div className="grid grid-cols-12 gap-3 items-start">
                  <div className="col-span-4">
                    <Label className="text-xs">Deskripsi</Label>
                    <Input
                      {...register(`items.${index}.description`)}
                      placeholder="Nama barang/jasa"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      min="1"
                      {...register(`items.${index}.qty`, {
                        valueAsNumber: true,
                      })}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label className="text-xs">Satuan</Label>
                    <Input
                      {...register(`items.${index}.unit`)}
                      placeholder="pcs"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label className="text-xs">Harga Unit</Label>
                    <Input
                      type="number"
                      {...register(`items.${index}.unit_price`, {
                        valueAsNumber: true,
                      })}
                    />
                  </div>

                  <div className="col-span-1">
                    <Label className="text-xs">Diskon</Label>
                    <Input
                      type="number"
                      {...register(`items.${index}.discount`, {
                        valueAsNumber: true,
                      })}
                    />
                  </div>

                  <div className="col-span-1">
                    <Label className="text-xs">&nbsp;</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                      className="text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-2">
                  <Input
                    {...register(`items.${index}.notes`)}
                    placeholder="Catatan item..."
                    className="text-sm"
                  />
                </div>

                {items[index] && (
                  <p className="text-xs text-gray-500 mt-2 text-right">
                    Subtotal: {" "}
                    {formatRupiah(
                      (items[index].qty || 0) * (items[index].unit_price || 0) -
                        (items[index].discount || 0)
                    )}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {errors.items && (
          <p className="text-sm text-red-500 mt-2">{errors.items.message}</p>
        )}
      </div>

      {/* Calculations */}
      <Card className="bg-gray-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold">Kalkulasi</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <Label htmlFor="discount_percent">Diskon (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  {...register("discount_percent", { valueAsNumber: true })}
                />
              </div>

              <div>
                <Label htmlFor="tax_percent">PPN (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  {...register("tax_percent", { valueAsNumber: true })}
                />
              </div>

              <div>
                <Label htmlFor="shipping_cost">Biaya Pengiriman</Label>
                <Input
                  type="number"
                  min="0"
                  {...register("shipping_cost", { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="space-y-2 text-right">
              <div className="flex justify-between py-1">
                <span className="text-gray-600">Subtotal:</span>
                <span>{formatRupiah(calculations.subtotal)}</span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-gray-600">Diskon ({discountPercent || 0}%):</span>
                <span className="text-red-600">
                  -{formatRupiah(calculations.discountAmount)}
                </span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-gray-600">PPN ({taxPercent || 0}%):</span>
                <span>{formatRupiah(calculations.taxAmount)}</span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-gray-600">Biaya Pengiriman:</span>
                <span>{formatRupiah(shippingCost || 0)}</span>
              </div>

              <div className="mt-2 flex justify-between border-t border-gray-200/70 py-2">
                <span className="font-bold text-lg">TOTAL:</span>
                <span className="font-bold text-2xl text-gray-900">
                  {formatRupiah(calculations.total)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-3 border-t border-gray-200/70 pt-4">
        <Button type="submit" variant="outline" disabled={isLoading} className="purchasing-secondary-button">
          Simpan Draft
        </Button>
        <Button type="submit" disabled={isLoading} className="purchasing-main-button">
          {isLoading ? "Menyimpan..." : "Buat PO"}
        </Button>
      </div>
    </form>
  );
}
