// ============================================
// API ROUTE: /api/purchasing/units
// ============================================

import { NextRequest } from "next/server";
import { createServerPgClient } from "@/lib/pg/create-client";
import { z } from "zod";
import {
  getApiUserScope,
  companyScopeOr,
  effectiveCompanyId,
} from "@/lib/api/scope";

// Validation schema
const unitSchema = z.object({
  kode: z.string().min(1, "Kode satuan wajib diisi").max(10),
  nama: z.string().min(1, "Nama satuan wajib diisi").max(50),
  tipe: z.enum(["BESAR", "KECIL", "KONVERSI"], {
    message: "Tipe satuan wajib dipilih",
  }),
  deskripsi: z.string().optional(),
});

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getValidationMessage(error: z.ZodError) {
  return error.issues[0]?.message || "Validasi gagal";
}

// GET /api/purchasing/units
export async function GET(request: NextRequest) {
  try {
    const db = await createServerPgClient();
    const scope = await getApiUserScope();
    const { searchParams } = new URL(request.url);
    
    const search = searchParams.get("search");
    const isActive = searchParams.get("is_active");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    
    let query = db
      .from("units")
      .select("*", { count: "exact" })
      .is("deleted_at", null)
      .order("nama", { ascending: true });

    // Business scope: company user lihat data company-nya + template global
    const scopeOr = companyScopeOr(scope);
    if (scopeOr) {
      query = query.or(scopeOr);
    }
    
    // Search filter
    if (search) {
      query = query.or(`kode.ilike.%${search}%,nama.ilike.%${search}%`);
    }
    
    // Active filter
    if (isActive !== null) {
      query = query.eq("is_active", isActive === "true");
    }
    
    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, error, count } = await query.range(from, to);
    
    if (error) throw error;
    
    return Response.json({ 
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      }
    });
  } catch (error: unknown) {
    console.error("Error fetching units:", error);
    return Response.json(
      { message: getErrorMessage(error, "Gagal mengambil data satuan") },
      { status: 500 }
    );
  }
}

// POST /api/purchasing/units
export async function POST(request: NextRequest) {
  try {
    const db = await createServerPgClient();
    const scope = await getApiUserScope();
    const companyId = effectiveCompanyId(scope);
    const body = await request.json();
    
    // Validasi input
    const validated = unitSchema.parse(body);
    
    // Cek kode unik dalam scope (company user vs global)
    let existingQuery = db
      .from("units")
      .select("id")
      .eq("kode", validated.kode)
      .is("deleted_at", null);
    existingQuery = companyId
      ? existingQuery.eq("company_id", companyId)
      : existingQuery.is("company_id", null);
    const { data: existing } = await existingQuery.maybeSingle();
    
    if (existing) {
      return Response.json(
        { message: "Kode satuan sudah digunakan" },
        { status: 400 }
      );
    }
    
    // Insert data
    const { data, error } = await db
      .from("units")
      .insert({
        ...validated,
        company_id: companyId,
        is_active: true,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return Response.json(
      { data },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error creating unit:", error);
    
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          message: getValidationMessage(error),
          errors: error.flatten().fieldErrors
        },
        { status: 400 }
      );
    }
    
    return Response.json(
      { message: getErrorMessage(error, "Gagal menambahkan satuan") },
      { status: 500 }
    );
  }
}
