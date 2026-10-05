import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/middleware", () => ({ updateSession: vi.fn() }));
const { isStoreHost, isStorePassthroughPath } = await import("./proxy");

describe("host website toko (EPIC-054)", () => {
  it("cocok persis dengan daftar STORE_HOSTS (tanpa port, tanpa beda huruf)", () => {
    const hosts = "shop-paddy.reddie.id, toko.paddy.id";
    expect(isStoreHost("shop-paddy.reddie.id", hosts)).toBe(true);
    expect(isStoreHost("SHOP-PADDY.reddie.id:443", hosts)).toBe(true);
    expect(isStoreHost("toko.paddy.id", hosts)).toBe(true);
    expect(isStoreHost("paddy.reddie.id", hosts)).toBe(false);
    expect(isStoreHost("shop-paddy.reddie.id.evil.com", hosts)).toBe(false);
    expect(isStoreHost("shop-paddy.reddie.id", "")).toBe(false);
  });

  it("API, aset Next & file statis tidak di-rewrite ke /store", () => {
    expect(isStorePassthroughPath("/api/public/store/cart")).toBe(true);
    expect(isStorePassthroughPath("/_next/static/chunk.js")).toBe(true);
    expect(isStorePassthroughPath("/products/paddy/pdy-cs-001.webp")).toBe(true);
    expect(isStorePassthroughPath("/store/banners/hero-bags.webp")).toBe(true);
    expect(isStorePassthroughPath("/")).toBe(false);
    expect(isStorePassthroughPath("/product/paddywatch-nea")).toBe(false);
    expect(isStorePassthroughPath("/product-category/paddy-cases")).toBe(false);
  });
});
