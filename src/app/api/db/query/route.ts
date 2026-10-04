import { NextResponse } from "next/server";
import { QueryBuilder } from "@/lib/pg/query-builder";
import { getSessionUserFromCookies } from "@/lib/auth/session";

export async function POST(request: Request) {
  const user = await getSessionUserFromCookies();
  if (!user) {
    return NextResponse.json({ data: null, error: { message: "Authentication required" } }, { status: 401 });
  }

  try {
    const spec = await request.json();
    const result = await QueryBuilder.fromSpec(spec);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ data: null, error: { message: err.message } }, { status: 400 });
  }
}
