import { createServerPgClient } from "@/lib/pg/create-client";
import { requireUser } from "@/lib/auth/require-user";
import { NextRequest, NextResponse } from "next/server";

type PRSubmitUpdate = {
  status: "pending_head";
  current_approval_level: "head_dept";
  updated_at: string;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await createServerPgClient();
    const user = await requireUser();

    // Fetch PR
    const { data: pr, error: prError } = await db
      .from("purchase_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (prError || !pr) {
      return NextResponse.json(
        { error: "PR tidak ditemukan" },
        { status: 404 }
      );
    }

    // Check ownership
    if (pr.requester_id !== user.id) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses" },
        { status: 403 }
      );
    }

    // Only draft can be submitted
    if (pr.status !== "draft") {
      return NextResponse.json(
        { error: "Hanya PR dengan status draft yang bisa disubmit" },
        { status: 400 }
      );
    }

    const updates: PRSubmitUpdate = {
      status: "pending_head",
      current_approval_level: "head_dept",
      updated_at: new Date().toISOString(),
    };

    const { data: updatedPR, error: updateError } = await db
      .from("purchase_requests")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ data: updatedPR });
  } catch (error) {
    console.error("Error submitting PR:", error);
    return NextResponse.json(
      { error: "Gagal submit PR" },
      { status: 500 }
    );
  }
}
