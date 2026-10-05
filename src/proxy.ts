import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/auth/middleware";

/**
 * Serves the member portal at its own hostname.
 *
 *   member.suluinwounderland.com/            -> /member
 *   member.suluinwounderland.com/classic     -> /member/classic
 *
 * The pages keep living under src/app/member; only the public URL changes.
 * dashboard.suluinwounderland.com is untouched and still serves /member too,
 * so nothing breaks while the new hostname is being rolled out.
 *
 * Next.js 16 renamed this file convention from `middleware.ts` to `proxy.ts`
 * and the export from `middleware` to `proxy`. The old names are silently
 * ignored on 16 -- the file exists, nothing runs.
 *
 * Requires the tunnel to pass the original Host through: if the Public
 * Hostname entry sets an "HTTP Host Header" override, every request arrives
 * as the dashboard host and this never fires.
 */

/**
 * True when any DNS label of the host is exactly "member". Matching the label
 * rather than a "member." prefix is what makes this work across environments:
 * production is member.suluinwounderland.com (label first), while the dev
 * hostname is dev.sulu.member.wit.id (label in the middle). A prefix check
 * silently served the dashboard on dev.
 */
function isMemberHost(hostHeader: string): boolean {
  const hostname = hostHeader.split(":")[0].toLowerCase();
  return hostname.split(".").includes("member");
}

/**
 * Website toko publik (EPIC-054) di hostname sendiri, mis. shop-paddy.reddie.id.
 * Daftar host dari env STORE_HOSTS (runtime, dipisah koma). Halaman tinggal di
 * src/app/(store)/store; host toko melihatnya di root (/, /shop, /product/…).
 * ERP (dashboard/login) tidak bisa diakses lewat host toko — rewrite ke
 * /store/* membuatnya 404.
 */
export function isStoreHost(hostHeader: string, configured = process.env.STORE_HOSTS ?? ""): boolean {
  const hostname = hostHeader.split(":")[0].toLowerCase();
  return configured
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean)
    .includes(hostname);
}

/** Path host toko yang TIDAK di-rewrite: API, aset Next, dan file statis public/. */
export function isStorePassthroughPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    /\.[a-z0-9]{2,5}$/i.test(pathname)
  );
}

function rewriteStoreHost(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isStorePassthroughPath(pathname)) {
    return pathname.startsWith("/api/") ? updateSession(request) : NextResponse.next();
  }
  const url = request.nextUrl.clone();
  url.pathname = pathname === "/" ? "/store" : `/store${pathname}`;
  // Halaman toko membuat tautan tanpa prefix /store di host toko.
  const headers = new Headers(request.headers);
  headers.set("x-store-base", "");
  return NextResponse.rewrite(url, { request: { headers } });
}

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  if (isStoreHost(host)) return rewriteStoreHost(request);
  if (!isMemberHost(host)) return updateSession(request);

  const { pathname } = request.nextUrl;

  // /api/* tidak boleh di-rewrite (portal memanggil /api/member-portal/*
  // dengan path absolut), TAPI tetap lewat updateSession: gerbang auth +
  // validasi Bearer token Open API (EPIC-042) harus berlaku di host member
  // juga — tanpa ini route API tanpa cek sesi terbuka lewat host member.
  // /api/member-portal ada di daftar publik, jadi portal tidak terganggu.
  if (pathname.startsWith("/api")) {
    return updateSession(request);
  }
  // /member/* is already correct -- links in the app emit absolute /member/...
  // paths, so they must not get prefixed twice.
  if (pathname.startsWith("/member")) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = pathname === "/" ? "/member" : `/member${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Static assets are served from the same origin under the member host too,
  // so they must not be rewritten into /member/_next/...
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
