import { NextRequest, NextResponse } from 'next/server';
import { createServerPgClient } from "@/lib/pg/create-client";

/**
 * GET /api/hris/notifications
 * Get user notifications
 */
export async function GET(request: NextRequest) {
  try {
    const db = await createServerPgClient();
    
    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const unreadOnly = searchParams.get('unread') === 'true';

    // Check authentication
    const { data: { user } } = await db.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Build query
    let query = db
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    query = query.limit(limit);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json(
        { error: 'Failed to fetch notifications', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data || [],
      pagination: {
        limit,
        total: count || 0,
      },
    });
  } catch (error) {
    console.error('Error in notifications GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/hris/notifications/mark-read
 * Mark notification(s) as read
 */
export async function POST(request: NextRequest) {
  try {
    const db = await createServerPgClient();
    const body = await request.json();

    // Check authentication
    const { data: { user } } = await db.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { notification_id, mark_all } = body;

    if (mark_all) {
      const { error } = await db
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications read:', error);
        return NextResponse.json(
          { error: 'Failed to mark notifications as read', details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ message: 'All notifications marked as read' });

    } else if (notification_id) {
      const { error } = await db
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notification_id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error marking notification read:', error);
        return NextResponse.json(
          { error: 'Failed to mark notification as read', details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ message: 'Notification marked as read' });
    }

    return NextResponse.json(
      { error: 'notification_id or mark_all is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in notifications POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
