import { NextRequest, NextResponse } from "next/server";
import { createServerPgClient } from "@/lib/pg/create-client";
import {
  getApiUserScope,
  companyScopeOr,
  branchScopeOr,
} from "@/lib/api/scope";

export async function GET(request: NextRequest) {
  try {
    const db = await createServerPgClient();
    const { searchParams } = new URL(request.url);

    const poId = searchParams.get("po_id");
    const status = searchParams.get("status");

    let query = db
      .from("deliveries")
      .select(`
        *,
        po:nomor_po,status,
        supplier:supplier_id(id,kode,nama_supplier)
      `, { count: "exact" })
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    const scope = await getApiUserScope();
    const companyOr = companyScopeOr(scope);
    if (companyOr) query = query.or(companyOr);
    const branchOr = branchScopeOr(scope);
    if (branchOr) query = query.or(branchOr);

    if (poId) query = query.eq("po_id", poId);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (error: any) {
    console.error("Error fetching deliveries:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch deliveries" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await createServerPgClient();
    const body = await request.json();

    // Get PO details for supplier_id + scope (delivery mewarisi branch PO)
    const { data: po } = await db
      .from("purchase_orders")
      .select("supplier_id, company_id, branch_id")
      .eq("id", body.po_id)
      .single();

    if (!po) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    const { data, error } = await db
      .from("deliveries")
      .insert({
        ...body,
        supplier_id: po.supplier_id,
        company_id: po.company_id ?? null,
        branch_id: po.branch_id ?? null,
        status: "IN_TRANSIT",
      })
      .select(`
        *,
        po:nomor_po,status,
        supplier:supplier_id(id,kode,nama_supplier)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Error creating delivery:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create delivery" },
      { status: 500 }
    );
  }
}
