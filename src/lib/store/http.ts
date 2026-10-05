// Website toko publik (EPIC-054) — helper HTTP API publik.
import { NextResponse } from "next/server";
import { checkRateLimit, clientIpFrom, type RateLimitRule } from "@/lib/public/rate-limit";

export function storeError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

/** null = lolos; selain itu respons 429. */
export function storeRateLimit(request: Request, name: string, rule: RateLimitRule) {
  const ip = clientIpFrom(request.headers);
  if (checkRateLimit(`store-${name}:${ip}`, rule)) return null;
  return storeError("Terlalu banyak permintaan — coba lagi sebentar", 429);
}

/** Origin publik website toko (untuk tautan di invoice/WA). */
export function storeOriginFrom(request: Request): string {
  const configured = (process.env.STORE_PUBLIC_URL || "").trim().replace(/\/+$/, "");
  if (configured) return configured;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost";
  const proto = request.headers.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}
