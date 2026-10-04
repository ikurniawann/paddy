import { NextRequest, NextResponse } from 'next/server';
import { createPgClient } from "@/lib/pg/create-client";
import { getPosSession } from '@/lib/api/auth';

// PATCH /api/pos/orders/{id}/splits/{splitId} — cancel a split
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; splitId: string }> }
) {
  const sessionUserId = await getPosSession();
  if (!sessionUserId) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const { splitId } = await params;
    const db = createPgClient();

    const { data, error } = await db.rpc('pos_cancel_split', {
      p_split_id: splitId,
      p_cashier_id: await resolveCashierId(sessionUserId),
    });

    if (error) {
      console.error('RPC cancel split error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const result = typeof data === 'string' ? JSON.parse(data) : data;
    if (!result?.success) {
      return NextResponse.json({ success: false, error: result?.error || 'Cancel failed' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error cancelling split:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function resolveCashierId(sessionUserId: string): Promise<string> {
  return '00000000-0000-0000-0000-000000000001';
}
