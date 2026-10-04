import { describe, expect, it } from "vitest";
import { resolvePosBusinessMode } from "./business-mode";

describe("resolvePosBusinessMode", () => {
  it("hanya 'retail' (tanpa beda huruf/spasi) yang mengaktifkan mode retail", () => {
    expect(resolvePosBusinessMode("retail")).toBe("retail");
    expect(resolvePosBusinessMode(" Retail ")).toBe("retail");
  });
  it("default F&B untuk nilai kosong / lain", () => {
    expect(resolvePosBusinessMode(undefined)).toBe("fnb");
    expect(resolvePosBusinessMode("")).toBe("fnb");
    expect(resolvePosBusinessMode("fnb")).toBe("fnb");
    expect(resolvePosBusinessMode("toko")).toBe("fnb");
  });
});
