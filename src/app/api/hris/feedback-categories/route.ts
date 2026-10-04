import { NextRequest, NextResponse } from 'next/server';
import { createPgClient } from "@/lib/pg/create-client";

export async function GET() {
  try {
    const db = createPgClient();

    const { data, error } = await db
      .from('feedback_categories')
      .select(`
        *,
        criteria:feedback_criteria(id, name, description, display_order)
      `)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('Error fetching feedback categories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = createPgClient();
    const body = await request.json();

    const { data, error } = await db
      .from('feedback_categories')
      .insert(body)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Error creating feedback category:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
