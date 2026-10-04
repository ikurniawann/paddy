// ============================================
// API ROUTE: /api/purchasing/units/[id]
// ============================================

import { NextRequest } from "next/server";
import { createServerPgClient } from "@/lib/pg/create-client";
import { z } from "zod";

const unitSchema = z.object({
  kode: z.string().min(1).max(10).optional(),
  nama: z.string().min(1).max(50).optional(),
  tipe: z.enum(["BESAR", "KECIL", "KONVERSI"], {
    message: "Tipe satuan wajib dipilih",
  }).optional(),
  deskripsi: z.string().optional(),
  is_active: z.boolean().optional(),
});

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getValidationMessage(error: z.ZodError) {
  return error.issues[0]?.message || "Validasi gagal";
}

// GET /api/purchasing/units/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await createServerPgClient();
    
    const { data, error } = await db
      .from("units")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();
    
    if (error) {
      if (error.code === "PGRST116") {
        return Response.json(
          { success: false, message: "Satuan tidak ditemukan" },
          { status: 404 }
        );
      }
      throw error;
    }
    
    return Response.json({ success: true, data });
  } catch (error: unknown) {
    console.error("Error fetching unit:", error);
    return Response.json(
      { success: false, message: getErrorMessage(error, "Gagal mengambil data satuan") },
      { status: 500 }
    );
  }
}

// PUT /api/purchasing/units/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await createServerPgClient();
    const body = await request.json();
    
    // Validasi input
    const validated = unitSchema.parse(body);
    
    // Cek kode unik jika diupdate (dalam scope company baris ini)
    if (validated.kode) {
      const { data: current } = await db
        .from("units")
        .select("company_id")
        .eq("id", id)
        .maybeSingle();
      const currentCompanyId = (current as { company_id: string | null } | null)?.company_id ?? null;

      let existingQuery = db
        .from("units")
        .select("id")
        .eq("kode", validated.kode)
        .neq("id", id)
        .is("deleted_at", null);
      existingQuery = currentCompanyId
        ? existingQuery.eq("company_id", currentCompanyId)
        : existingQuery.is("company_id", null);
      const { data: existing } = await existingQuery.maybeSingle();
      
      if (existing) {
        return Response.json(
          { success: false, message: "Kode satuan sudah digunakan" },
          { status: 400 }
        );
      }
    }
    
    // Update data
    const { data, error } = await db
      .from("units")
      .update({
        ...validated,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .is("deleted_at", null)
      .select()
      .single();
    
    if (error) {
      if (error.code === "PGRST116") {
        return Response.json(
          { success: false, message: "Satuan tidak ditemukan" },
          { status: 404 }
        );
      }
      throw error;
    }
    
    return Response.json({
      success: true,
      data,
      message: "Satuan berhasil diupdate",
    });
  } catch (error: unknown) {
    console.error("Error updating unit:", error);
    
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          success: false,
          message: getValidationMessage(error),
          errors: error.flatten().fieldErrors
        },
        { status: 400 }
      );
    }
    
    return Response.json(
      { success: false, message: getErrorMessage(error, "Gagal mengupdate satuan") },
      { status: 500 }
    );
  }
}

// DELETE /api/purchasing/units/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await createServerPgClient();
    const { data: authData } = await db.auth.getUser();
    
    // Cek apakah satuan digunakan di raw_materials
    const { data: usedInMaterials } = await db
      .from("raw_materials")
      .select("id")
      .or(`satuan_besar_id.eq.${id},satuan_kecil_id.eq.${id}`)
      .limit(1);
    
    if (usedInMaterials && usedInMaterials.length > 0) {
      return Response.json(
        { 
          success: false, 
          message: "Satuan tidak bisa dihapus karena masih digunakan di bahan baku" 
        },
        { status: 400 }
      );
    }
    
    // Soft delete: status remains reversible via update, delete hides the row.
    const { error } = await db
      .from("units")
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
        deleted_by: authData.user?.id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .is("deleted_at", null);
    
    if (error) {
      if (error.code === "PGRST116") {
        return Response.json(
          { success: false, message: "Satuan tidak ditemukan" },
          { status: 404 }
        );
      }
      throw error;
    }
    
    return Response.json({
      success: true,
      message: "Satuan berhasil dihapus",
    });
  } catch (error: unknown) {
    console.error("Error deleting unit:", error);
    return Response.json(
      { success: false, message: getErrorMessage(error, "Gagal menghapus satuan") },
      { status: 500 }
    );
  }
}
