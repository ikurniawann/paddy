import { NextResponse } from "next/server";
import { createPgClient } from "@/lib/pg/create-client";
import { getSessionUserFromCookies } from "@/lib/auth/session";

export async function POST(request: Request) {
  const user = await getSessionUserFromCookies();
  if (!user) {
    return NextResponse.json({ data: null, error: { message: "Authentication required" } }, { status: 401 });
  }

  try {
    const { fn, params } = await request.json();
    const client = createPgClient();
    const result = await client.rpc(fn, params ?? {});
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ data: null, error: { message: err.message } }, { status: 400 });
  }
}
