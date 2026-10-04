import { NextRequest } from "next/server";

// Penerimaan stock harus lewat Delivery/GRN agar audit, QC, qty_on_order,
// weighted average cost, dan inventory movement tetap satu jalur.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return Response.json(
    {
      success: false,
      message: "Penerimaan PO langsung sudah dinonaktifkan. Gunakan flow Delivery/GRN untuk menerima barang.",
      next_step: `/dashboard/purchasing/grn/insert?po_id=${id}`,
    },
    { status: 410 }
  );
}
