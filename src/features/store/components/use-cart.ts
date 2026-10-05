"use client";

import { useSyncExternalStore } from "react";
import {
  addToCart,
  cartCount,
  CART_STORAGE_KEY,
  parseCart,
  removeFromCart,
  serializeCart,
  setCartQty,
  type CartItem,
} from "@/features/store/lib/cart";
import { createLocalStore } from "@/features/store/lib/local-store";
import {
  parseWishlist,
  toggleWishlist,
  WISHLIST_STORAGE_KEY,
  type WishlistItem,
} from "@/features/store/lib/wishlist";

const EMPTY_CART: CartItem[] = [];
const EMPTY_WISHLIST: WishlistItem[] = [];

export const cartStore = createLocalStore<CartItem[]>(CART_STORAGE_KEY, parseCart, serializeCart, EMPTY_CART);
export const wishlistStore = createLocalStore<WishlistItem[]>(
  WISHLIST_STORAGE_KEY,
  parseWishlist,
  (items) => JSON.stringify(items),
  EMPTY_WISHLIST
);

/** Keranjang di localStorage — nilai server = kosong, lalu terhidrasi di browser. */
export function useCart() {
  const items = useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot, cartStore.getServerSnapshot);
  return {
    items,
    count: cartCount(items),
    add: (item: Omit<CartItem, "qty">, qty: number, max: number | null) =>
      cartStore.update((current) => addToCart(current, item, qty, max)),
    setQty: (key: string, qty: number) => cartStore.update((current) => setCartQty(current, key, qty)),
    remove: (key: string) => cartStore.update((current) => removeFromCart(current, key)),
    replace: (next: CartItem[]) => cartStore.update(() => next),
    clear: () => cartStore.update(() => []),
  };
}

export function useWishlist() {
  const items = useSyncExternalStore(
    wishlistStore.subscribe,
    wishlistStore.getSnapshot,
    wishlistStore.getServerSnapshot
  );
  return {
    items,
    count: items.length,
    has: (id: string) => items.some((row) => row.id === id),
    toggle: (item: WishlistItem) => wishlistStore.update((current) => toggleWishlist(current, item)),
  };
}

/** true setelah hidrasi (untuk konten yang hanya bermakna di browser). */
export function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}

function noopSubscribe() {
  return () => {};
}
