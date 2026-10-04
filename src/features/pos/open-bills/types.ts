export type { Order } from "@/lib/pos-api";

export interface OpenBillsListParams {
  limit?: number;
}

export interface UpdateOrderPaymentPayload {
  payment_status: string;
  payment_method?: string;
  amount_paid?: number;
  ark_coins_used?: number;
}
