import { describe, expect, it } from "vitest";
import {
  listingQuery,
  parseQueryNumber,
  resolveStoreBase,
  storeHref,
  whatsappHref,
} from "./href";
import {
  addToCart,
  capQty,
  cartCount,
  cartLineKey,
  maxPurchasableQty,
  mergeCarts,
  parseCart,
  reconcileCart,
  removeFromCart,
  serializeCart,
  setCartQty,
  type CartItem,
} from "./cart";
import { inWishlist, parseWishlist, toggleWishlist, type WishlistItem } from "./wishlist";
import { cartFulfillable, cartSubtotal, lineStockFor, type CheckoutStockLine } from "./checkout";
import type { StoreVariant } from "@/lib/store/types";
import { formatCountdown, orderStatusLabel, orderStepIndex, orderStatusTone, orderSteps } from "./order-status";

describe("store href", () => {
  it("resolves base from x-store-base header", () => {
    expect(resolveStoreBase("")).toBe("");
    expect(resolveStoreBase(null)).toBe("/store");
    expect(resolveStoreBase(undefined)).toBe("/store");
    expect(resolveStoreBase("/anything")).toBe("/store");
  });

  it("prefixes internal paths with base", () => {
    expect(storeHref("/store", "/")).toBe("/store");
    expect(storeHref("/store", "/shop")).toBe("/store/shop");
    expect(storeHref("/store", "shop?q=a")).toBe("/store/shop?q=a");
    expect(storeHref("/store", "/?x=1")).toBe("/store?x=1");
    expect(storeHref("", "/")).toBe("/");
    expect(storeHref("", "/product/a")).toBe("/product/a");
  });

  it("leaves absolute and special URLs untouched", () => {
    expect(storeHref("/store", "https://wa.me/62")).toBe("https://wa.me/62");
    expect(storeHref("/store", "mailto:a@b.c")).toBe("mailto:a@b.c");
    expect(storeHref("/store", "#top")).toBe("#top");
  });

  it("builds listing query without defaults", () => {
    expect(listingQuery({})).toBe("");
    expect(listingQuery({ sort: "newest", page: 1 })).toBe("");
    expect(listingQuery({ q: " case ", sort: "price_asc", min: "1000", max: 5000.4, page: 3 })).toBe(
      "?q=case&sort=price_asc&min=1000&max=5000&page=3"
    );
    expect(listingQuery({ min: "abc", max: -1 })).toBe("");
  });

  it("parses numeric query params", () => {
    expect(parseQueryNumber("12")).toBe(12);
    expect(parseQueryNumber(["5", "6"])).toBe(5);
    expect(parseQueryNumber("")).toBeNull();
    expect(parseQueryNumber("-3")).toBeNull();
    expect(parseQueryNumber(undefined)).toBeNull();
  });

  it("builds whatsapp links", () => {
    expect(whatsappHref("")).toBeNull();
    expect(whatsappHref("+62 812-3456", "Halo PAD-1")).toBe("https://wa.me/628123456?text=Halo%20PAD-1");
  });
});

describe("cart storage", () => {
  const a: CartItem = { productId: "p1", skuId: "s1", qty: 1 };

  it("parses and merges stored lines, ignoring garbage", () => {
    expect(parseCart(null)).toEqual([]);
    expect(parseCart("not json")).toEqual([]);
    expect(parseCart('{"a":1}')).toEqual([]);
    const raw = JSON.stringify([
      { productId: "p1", skuId: "s1", qty: 2 },
      { productId: "p1", skuId: "s1", qty: 3 },
      { productId: "p2", qty: 1 },
      { productId: "", qty: 1 },
      { productId: "p3", qty: 0 },
      null,
    ]);
    expect(parseCart(raw)).toEqual([
      { productId: "p1", skuId: "s1", qty: 5 },
      { productId: "p2", skuId: null, qty: 1 },
    ]);
  });

  it("round-trips through serialize", () => {
    const items = [a, { productId: "p2", skuId: null, qty: 4 }];
    expect(parseCart(serializeCart(items))).toEqual(items);
  });

  it("adds, merges and caps quantity by stock", () => {
    let cart = addToCart([], a, 2, 5);
    expect(cart).toEqual([{ productId: "p1", skuId: "s1", qty: 2 }]);
    cart = addToCart(cart, a, 10, 5);
    expect(cart).toEqual([{ productId: "p1", skuId: "s1", qty: 5 }]);
    cart = addToCart(cart, { productId: "p1", skuId: "s2" }, 1, 0);
    expect(cart).toHaveLength(1);
    expect(cartCount(addToCart(cart, { productId: "p9", skuId: null }, 150))).toBe(5 + 99);
  });

  it("sets quantity and removes lines", () => {
    const cart = [a, { productId: "p2", skuId: null, qty: 1 }];
    expect(setCartQty(cart, cartLineKey(a), 7)[0].qty).toBe(7);
    expect(setCartQty(cart, cartLineKey(a), 0)).toHaveLength(1);
    expect(removeFromCart(cart, "p2:")).toEqual([a]);
  });

  it("merges two carts", () => {
    expect(mergeCarts([a], [{ ...a, qty: 98 }])).toEqual([{ ...a, qty: 99 }]);
  });

  it("computes the purchasable maximum and caps qty", () => {
    expect(maxPurchasableQty({ shipStock: 2, pickupStock: { w1: 5, w2: 0 } })).toBe(5);
    expect(maxPurchasableQty({ shipStock: 0, pickupStock: {} })).toBe(0);
    expect(capQty(10, 3)).toBe(3);
    expect(capQty(0, 3)).toBe(1);
    expect(capQty(5, 0)).toBe(0);
    expect(capQty(500, null)).toBe(99);
  });

  it("reconciles the cart against a server snapshot", () => {
    const cart: CartItem[] = [
      { productId: "p1", skuId: "s1", qty: 5 },
      { productId: "gone", skuId: "x", qty: 1 },
      { productId: "p3", skuId: null, qty: 4 },
      { productId: "p4", skuId: "s4", qty: 2 },
    ];
    const result = reconcileCart(cart, [
      { productId: "p1", skuId: "s1", shipStock: 1, pickupStock: { w: 3 } },
      null,
      { productId: "p3", skuId: null, shipStock: 0, pickupStock: {} },
      { productId: "p4", skuId: "s4", shipStock: 0, pickupStock: {} },
    ]);
    expect(result.removed).toBe(1);
    expect(result.changed).toBe(true);
    expect(result.items).toEqual([
      { productId: "p1", skuId: "s1", qty: 3 },
      { productId: "p3", skuId: null, qty: 4 },
      { productId: "p4", skuId: "s4", qty: 2 },
    ]);
  });
});

describe("wishlist storage", () => {
  const item: WishlistItem = {
    id: "p1",
    slug: "a",
    name: "A",
    imageUrl: null,
    price: 1000,
    compareAtPrice: null,
    categoryName: null,
  };

  it("toggles items", () => {
    const one = toggleWishlist([], item);
    expect(inWishlist(one, "p1")).toBe(true);
    expect(toggleWishlist(one, item)).toEqual([]);
  });

  it("parses stored data defensively", () => {
    expect(parseWishlist("[1,2]")).toEqual([]);
    expect(parseWishlist(JSON.stringify([item, item, { id: "x" }]))).toEqual([item]);
    expect(parseWishlist("{")).toEqual([]);
  });
});

describe("checkout helpers", () => {
  const lines: CheckoutStockLine[] = [
    { skuId: "s1", qty: 2, shipStock: 3, pickupStock: { w1: 1, w2: 5 } },
    { skuId: null, qty: 9, shipStock: 0, pickupStock: {} },
  ];

  it("reads stock per method", () => {
    expect(lineStockFor(lines[0], "flat")).toBe(3);
    expect(lineStockFor(lines[0], "pickup", "w1")).toBe(1);
    expect(lineStockFor(lines[0], "pickup", "w9")).toBe(0);
    expect(lineStockFor(lines[1], "flat")).toBeNull();
  });

  it("checks whole-cart fulfilment", () => {
    expect(cartFulfillable(lines, "flat")).toBe(true);
    expect(cartFulfillable(lines, "pickup", "w1")).toBe(false);
    expect(cartFulfillable(lines, "pickup", "w2")).toBe(true);
    expect(cartFulfillable([], "flat")).toBe(false);
  });

  it("sums subtotal", () => {
    expect(cartSubtotal([{ price: 1000, qty: 2 }, { price: 500, qty: 1 }])).toBe(2500);
  });
});

describe("order status", () => {
  it("labels statuses", () => {
    expect(orderStatusLabel("pending")).toBe("Menunggu pembayaran");
    expect(orderStatusLabel("packing", "pickup")).toBe("Siap diambil");
    expect(orderStatusLabel("completed", "pickup")).toBe("Sudah diambil");
    expect(orderStatusLabel("packing", "flat")).toBe("Diproses");
    expect(orderStatusLabel("shipped", "flat")).toBe("Dikirim");
    expect(orderStatusTone("cancelled")).toBe("red");
    expect(orderStepIndex("packing")).toBe(2);
    expect(orderStepIndex("cancelled")).toBe(-1);
    expect(orderStepIndex("completed", "pickup")).toBe(3);
    expect(orderSteps("pickup").map((step) => step.key)).toEqual(["pending", "paid", "packing", "completed"]);
    expect(orderSteps("flat")).toHaveLength(5);
  });

  it("formats countdowns", () => {
    expect(formatCountdown(0)).toBe("");
    expect(formatCountdown((23 * 3600 + 5 * 60) * 1000)).toBe("23 jam 5 menit");
    expect(formatCountdown(125_000)).toBe("2 menit 5 detik");
  });
});

describe("listing params", () => {
  it("normalizes search params", async () => {
    const { parseListingParams } = await import("./href");
    expect(parseListingParams({})).toEqual({ q: "", sort: "newest", min: null, max: null, page: 1 });
    expect(parseListingParams({ q: " tas ", sort: "price_desc", min: "1000", max: "x", page: "2.7" })).toEqual({
      q: "tas",
      sort: "price_desc",
      min: 1000,
      max: null,
      page: 2,
    });
    expect(parseListingParams({ sort: "evil", page: "0" }).sort).toBe("newest");
  });
});

describe("variant helpers", () => {
  it("labels axes and summarises pickup stock", async () => {
    const { axisLabel, pickupStockSummary, optionValueState, variantsMatching, buildDescription } = await import("./variants");
    expect(axisLabel("Tipe HP")).toBe("Merk HP");
    expect(axisLabel("Warna")).toBe("Warna");
    const points = [
      { warehouseId: "w1", name: "Paddy Playstore Gandapura", address: "", city: "", openingHours: null },
      { warehouseId: "w2", name: "Paddy Store PVJ", address: "", city: "", openingHours: null },
    ];
    expect(pickupStockSummary({ pickupStock: { w1: 5 } }, points)).toBe("Gandapura (5), PVJ (0)");
    const variants: StoreVariant[] = [
      { id: "a", sku: "a", name: "a", options: { Warna: "Pink", "Tipe HP": "X" }, price: 1, shipStock: 0, pickupStock: { w1: 0 } },
      { id: "b", sku: "b", name: "b", options: { Warna: "Black", "Tipe HP": "X" }, price: 1, shipStock: 2, pickupStock: {} },
    ];
    expect(variantsMatching(variants, { Warna: "Pink" })).toHaveLength(1);
    expect(optionValueState(variants, { Warna: "Pink" }, "Tipe HP", "X")).toBe("soldout");
    expect(optionValueState(variants, { Warna: "Black" }, "Tipe HP", "X")).toBe("ok");
    expect(optionValueState(variants, { Warna: "Black" }, "Tipe HP", "Y")).toBe("none");
    expect(
      buildDescription({ description: "Halo.", longDescription: "Halo. Varian: Warna.", categorySlug: "paddy-watch", name: "Nea" })
    ).toEqual(["Halo. Varian: Warna."]);
    expect(
      buildDescription({ description: "Motif lucu", longDescription: null, categorySlug: "paddy-cases", name: "X" })
    ).toHaveLength(2);
  });
});
