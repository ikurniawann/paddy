import { redirect } from "next/navigation";
import { PURCHASING_ITEMS_LANDING } from "@/modules/purchasing/constants/items-nav";

export default function PurchasingMainRedirectPage() {
  redirect(PURCHASING_ITEMS_LANDING);
}
